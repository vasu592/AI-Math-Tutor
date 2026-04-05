from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
import uuid
import os

from models.database import Student, get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "changeme-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    grade: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def create_token(student_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode(
        {"sub": student_id, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM
    )


def verify_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Student:
    student_id = verify_token(credentials.credentials)
    result = await db.execute(
        select(Student).where(Student.id == uuid.UUID(student_id))
    )
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=401, detail="Student not found")
    return student


@router.post("/register")
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if req.grade not in range(4, 13):
        raise HTTPException(status_code=400, detail="Grade must be between 4 and 12")
    result = await db.execute(select(Student).where(Student.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    student = Student(
        name=req.name,
        email=req.email,
        grade=req.grade,
        password_hash=pwd_context.hash(req.password),
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    token = create_token(str(student.id))
    return {
        "token": token,
        "student": {
            "id": str(student.id),
            "name": student.name,
            "email": student.email,
            "grade": student.grade,
        },
    }


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Student).where(Student.email == req.email))
    student = result.scalar_one_or_none()
    if not student or not pwd_context.verify(req.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(str(student.id))
    return {
        "token": token,
        "student": {
            "id": str(student.id),
            "name": student.name,
            "email": student.email,
            "grade": student.grade,
        },
    }


@router.get("/me")
async def me(student: Student = Depends(get_current_student)):
    return {
        "id": str(student.id),
        "name": student.name,
        "email": student.email,
        "grade": student.grade,
    }
