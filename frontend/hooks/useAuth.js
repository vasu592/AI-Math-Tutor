import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { getMe } from '../lib/api';
import { useRouter } from 'next/router';

export function useAuth({ redirect = true } = {}) {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token) {
      setLoading(false);
      if (redirect) router.replace('/auth/login');
      return;
    }
    getMe()
      .then((data) => setStudent(data))
      .catch(() => {
        Cookies.remove('token');
        if (redirect) router.replace('/auth/login');
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    Cookies.remove('token');
    router.push('/');
  };

  return { student, loading, logout };
}
