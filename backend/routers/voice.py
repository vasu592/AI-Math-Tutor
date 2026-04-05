from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from routers.auth import get_current_student
from models.database import Student
from services import ai_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    student: Student = Depends(get_current_student),
):
    if audio.content_type not in ["audio/webm", "audio/mp4", "audio/ogg", "audio/wav", "audio/mpeg", "audio/x-m4a"]:
        # Be lenient — accept any audio
        pass
    try:
        audio_bytes = await audio.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        filename = audio.filename or "audio.webm"
        text = await ai_service.transcribe_audio(audio_bytes, filename)
        return {"transcription": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
