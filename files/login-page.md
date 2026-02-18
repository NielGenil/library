# ✅ Django + Vite React Login System Documentation

## 📌 Overview

This document explains how to implement a **JWT-based login system** using:

* **Django + Django REST Framework (Backend)**
* **SimpleJWT for authentication**
* **Vite + React (Frontend)**
* **React Query + Axios + Cookies for token handling**

---

# 🧩 PART 1 — Backend (Django)

## ✅ 1. Create Virtual Environment

```bash
# Create project folder
mkdir backend
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

---

## ✅ 2. Install Required Libraries

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers
```

---

## ✅ 3. Create Django Project

```bash
django-admin startproject core .
```

---

## ✅ 4. Create Accounts App

```bash
python manage.py startapp accounts
```

---

## ✅ 5. Configure `settings.py`

### Set Custom User Model

```python
AUTH_USER_MODEL = 'accounts.CustomUser'
```

---

### Add Installed Apps

```python
INSTALLED_APPS = [

    # Libraries
    'rest_framework',
    'corsheaders',

    # Local apps
    'accounts',
]
```

---

### Configure CORS for Vite

```python
from datetime import timedelta
import socket

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    finally:
        s.close()
    return ip

local_ip = get_lan_ip()
CORS_ALLOWED_ORIGINS_DEFAULT = f"http://{local_ip}:5173"

ALLOWED_HOSTS = [local_ip, '127.0.0.1', 'localhost']

CORS_ALLOWED_ORIGINS = [
    CORS_ALLOWED_ORIGINS_DEFAULT,
    "http://localhost:5173",
]
```

---

### Add Middleware

```python
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]
```

---

### Configure JWT Authentication

```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    )
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_COOKIE_SECURE": False,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": 'Lax',
}
```

---

## ✅ 6. Create Custom User Model

### `accounts/models.py`

```python
from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, blank=True, null=True)

    first_name = models.CharField(max_length=50, blank=True, null=True)
    last_name = models.CharField(max_length=50, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
```

---

## ✅ 7. Register Custom User in Admin

### `accounts/admin.py`

```python
from django.contrib import admin
from .models import CustomUser
from django.contrib.auth.admin import UserAdmin

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('first_name', 'last_name', 'email')

admin.site.register(CustomUser, CustomUserAdmin)
```

---

## ✅ 8. Configure Authentication URLs

### `core/urls.py`

```python
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.urls import path

urlpatterns = [
    path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
```

---

## ✅ 9. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## ✅ 10. Create Superuser

```bash
python manage.py createsuperuser
```

---

## ✅ 11. Run Django Server

```bash
python manage.py runserver
```

---

# 🧩 PART 2 — Frontend (Vite + React)

## ✅ 1. Create Vite React Project

```bash
npm create vite@latest
```

### Follow the steps
``text
│
◇  Project name:
│  frontend
│
◇  Select a framework:
│  React
│
◇  Select a variant:
│  JavaScript + SWC
│
◇  Use Vite 8 beta (Experimental)?:
│  No
│
◇  Install with npm and start now?
│  Yes
```

---

## ✅ 2. Install Required Libraries

```bash
npm install axios js-cookie jwt-decode
npm install @tanstack/react-query react-router-dom lucide-react
npm install tailwindcss @tailwindcss/vite
```

---

## ✅ 3. Tailwind Setup

### `index.css`

```css
@import "tailwindcss";
```

---

## ✅ 4. Vite Config

### `vite.config.js`

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

---

## ✅ 5. Setup React Router & React Query

### `main.jsx`

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from './pages/login.jsx';

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/login", element: <LoginPage /> },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}/>
    </QueryClientProvider>
  </StrictMode>
)
```

---

# 🧩 PART 3 — API Configuration

### `src/api/api.js`

```js
import axios from "axios";
import Cookies from "js-cookie";

export const BASE_URL = `http://${window.location.hostname}:8000`;

let tokenInvalidCallback = null;
export const setTokenInvalidCallback = (callback) => {
  tokenInvalidCallback = callback;
};

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = Cookies.get("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && tokenInvalidCallback) {
      tokenInvalidCallback();
    }
    return Promise.reject(error);
  }
);

export const loginAPI = async (formData) => {
  const credentials = Object.fromEntries(formData.entries());
  const response = await fetch(`${BASE_URL}/api/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) throw await response.json();
  return response.json();
};
```

---

# 🧩 PART 4 — Authentication Helper Hook

### `src/hooks/useHelper.jsx`

```js
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { BASE_URL } from "../api/api";

export function useHelper() {
  const [token, setToken] = useState(Cookies.get("access"));
  const [isTokenValid, setIsTokenValid] = useState(true);
  const refreshTimeoutRef = useRef(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    if (!token) {
      setIsTokenValid(false);
      return;
    }

    const refreshAccessToken = async () => {
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      const refreshToken = Cookies.get("refresh");
      if (!refreshToken) {
        setIsTokenValid(false);
        isRefreshingRef.current = false;
        return false;
      }

      try {
        const response = await axios.post(`${BASE_URL}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;
        Cookies.set("access", newAccessToken);
        setToken(newAccessToken);
        setIsTokenValid(true);
        return true;
      } catch (error) {
        Cookies.remove("access");
        Cookies.remove("refresh");
        setToken(null);
        setIsTokenValid(false);
        return false;
      } finally {
        isRefreshingRef.current = false;
      }
    };

    try {
      const decoded = jwtDecode(token);
      const expirationTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiry = expirationTime - currentTime;

      if (timeUntilExpiry <= 0) {
        Cookies.remove("access");
        Cookies.remove("refresh");
        setToken(null);
        setIsTokenValid(false);
        return;
      }

      const refreshTime = timeUntilExpiry - 60000;

      if (refreshTime > 0) {
        refreshTimeoutRef.current = setTimeout(refreshAccessToken, refreshTime);
      } else {
        refreshAccessToken();
      }
    } catch {
      Cookies.remove("access");
      Cookies.remove("refresh");
      setToken(null);
      setIsTokenValid(false);
    }

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [token]);

  const isAuthenticated = !!token;

  const logout = () => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    Cookies.remove("access");
    Cookies.remove("refresh");
    setToken(null);
    setIsTokenValid(false);
  };

  const markTokenInvalid = () => setIsTokenValid(false);

  const hasPermission = (user, perm) => user?.permissions?.includes(perm);

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeMilitary = (timeString) => {
    if (!timeString) return "";
    const date = new Date(`1970-01-01T${timeString}`);
    return date
      .toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      .replace(":", "");
  };

  const formattedDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return `${formatDate(dateString)} at ${formatTimeMilitary(
      date.toTimeString().slice(0, 5)
    )}`;
  };

  return {
    isAuthenticated,
    logout,
    isTokenValid,
    token,
    hasPermission,
    markTokenInvalid,
    formatDate,
    formatTimeMilitary,
    formattedDateTime,
  };
}
```

---

# 🧩 PART 5 — Login Page Implementation

### `src/pages/login.jsx`

```js
import { LockKeyhole, Mail } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginAPI } from "../api/api";
import Cookies from "js-cookie";
import { useHelper } from "../hooks/useHelper";

function LoginPage() {
  const loginRef = useRef();
  const navigate = useNavigate();
  const { isAuthenticated } = useHelper();

  const { mutate: login } = useMutation({
    mutationFn: (loginData) => loginAPI(loginData),

    onSuccess: (data) => {
      console.log("Success", data);
      Cookies.set("access", data.access, { secure: false, sameSite: "Lax" });
      Cookies.set("refresh", data.refresh, {
        secure: false,
        sameSite: "Lax",
      });
      navigate("/");
    },

    onError: (error) => {
      console.error("Error", error);
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, []);

  if (isAuthenticated) {
    return null;
  }

  const loginSubmit = (e) => {
    e.preventDefault();

    const loginData = new FormData(loginRef.current);
    login(loginData);
  };

  return (
    <main className="flex w-screen h-screen justify-center items-center bg-slate-100">
      <div className="bg-white flex shadow-lg w-[450px] h-[500px]">
        <form
          ref={loginRef}
          onSubmit={loginSubmit}
          className="flex flex-col p-7 gap-6 justify-center items-center w-full"
        >
          <section className="flex justify-center items-center">
            <h1 className="text-violet-950 text-2xl">User Login</h1>
          </section>

          <section className="flex flex-col gap-4 w-full">
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 text-violet-950">
                <Mail size={18} />
              </span>

              <input
                type="email"
                name="email"
                placeholder="Enter your emial"
                className="border border-gray-300 p-2 rounded-lg w-full pl-10 focus:outline-none bg-indigo-950/10 focus:outline-none focus:ring-2 focus:ring-indigo-950"
              />
            </div>

            <div className="flex flex-col gap-1 w-full">
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700 text-violet-950">
                  <LockKeyhole size={18} />
                </span>

                <input
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  className="border border-gray-300 p-2 rounded-lg w-full pl-10 focus:outline-none bg-indigo-950/10 focus:outline-none focus:ring-2 focus:ring-indigo-950"
                />
              </div>
              <div className="flex flex-row-reverse">
                <p className="text-blue-400">Forgot password?</p>
              </div>
            </div>
          </section>

          <section className="flex justify-center items-center">
            <button
              className="bg-linear-to-bl from-indigo-700 to-violet-950 text-white px-4 py-2 rounded"
              type="submit"
            >
              Login
            </button>
          </section>
        </form>
      </div>
    </main>
  );
}

export default LoginPage;
```

---

# 🧩 PART 6 — Protected App Layout

### `src/App.jsx`

```js
import { useNavigate } from "react-router-dom";
import "./App.css";
import { useHelper } from "./hooks/useHelper";
import { setTokenInvalidCallback } from "./api/api";
import { useEffect, useState } from "react";
import {
  ArrowLeftFromLine,
  Bell,
  Calendar,
  ChartColumnDecreasing,
  CircleUserRound,
  House,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";

function App() {
  const { isAuthenticated, logout, isTokenValid, markTokenInvalid } =
    useHelper();
  const navigate = useNavigate();
  const [sidebar, setSidebar] = useState(false);

  useEffect(() => {
    setTokenInvalidCallback(markTokenInvalid);
  }, []);

  useEffect(() => {
    if (isTokenValid === false) {
      logout();
      navigate("/login");
    }
  }, [isTokenValid, logout, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (isTokenValid === null) {
    return (
      <div className="h-screen w-screen flex justify-center items-center">
        <div className="w-7 h-7 border-4 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const logoutSubmit = (e) => {
    e.preventDefault();
    logout();
    navigate("/login");
  };

  return (
    <main className="w-screen h-screen flex">
      <aside
        className="relative flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ease-in-out overflow-hidden shrink-0"
        style={{ width: sidebar ? "240px" : "56px" }}
      >
        {/* Header */}
        <div className="flex items-center h-14 px-3 border-b border-gray-100 shrink-0">
          {sidebar ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 overflow-hidden">
                <CircleUserRound size={28} className="shrink-0 text-gray-700" />
                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                  Welcome!
                </span>
              </div>
              <button
                onClick={() => setSidebar(false)}
                className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftFromLine size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSidebar(true)}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors mx-auto"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        {/* Nav */}
        <div className="flex flex-col flex-1 justify-between py-4 overflow-hidden">
          <div className="flex flex-col gap-6 px-2">
            {/* Section 1 */}
            <div className="flex flex-col gap-1">
              {sidebar && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
                  Main
                </span>
              )}
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
                <House
                  size={17}
                  className="shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors"
                />
                {sidebar && (
                  <span className="whitespace-nowrap font-medium">
                    Dashboard
                  </span>
                )}
              </button>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
                <Calendar
                  size={17}
                  className="shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors"
                />
                {sidebar && (
                  <span className="whitespace-nowrap font-medium">
                    Calendar
                  </span>
                )}
              </button>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
                <Bell
                  size={17}
                  className="shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors"
                />
                {sidebar && (
                  <span className="whitespace-nowrap font-medium">
                    Notifications
                  </span>
                )}
              </button>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
                <ChartColumnDecreasing
                  size={17}
                  className="shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors"
                />
                {sidebar && (
                  <span className="whitespace-nowrap font-medium">
                    Analytics
                  </span>
                )}
              </button>
            </div>

            {/* Section 2 */}
            <div className="flex flex-col gap-1">
              {sidebar && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-2 mb-1">
                  System
                </span>
              )}
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors group">
                <Settings
                  size={17}
                  className="shrink-0 text-gray-500 group-hover:text-gray-700 transition-colors"
                />
                {sidebar && (
                  <span className="whitespace-nowrap font-medium">
                    Settings
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Logout */}
          <div className="px-2">
            <button
              onClick={logoutSubmit}
              className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={17} className="shrink-0" />
              {sidebar && (
                <span className="whitespace-nowrap font-medium">Logout</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <section className="flex-1 overflow-auto" />
    </main>
  );
}

export default App;
```

---

# 🔐 Authentication Flow Diagram

```
User Login Form
      ↓
React → POST /api/login/
      ↓
Django SimpleJWT validates credentials
      ↓
Returns:
  access token (15 min)
  refresh token (1 day)
      ↓
React stores tokens in cookies
      ↓
Axios attaches Bearer token automatically
      ↓
Auto refresh token before expiration
```

---

# ✅ Running the Project

## Backend

```bash
python manage.py runserver 0.0.0.0:8000
```

## Frontend

```bash
npm run dev
```

---

# 🎯 Final Notes

* Django handles authentication securely using JWT
* React manages tokens in cookies
* Auto refresh prevents forced logout
* Axios interceptors handle invalid tokens globally


