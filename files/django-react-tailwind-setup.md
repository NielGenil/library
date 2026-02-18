# Django + React (Vite) + Tailwind CSS

### Step-by-Step Setup Guide

This guide explains how to create a **Django backend** and a **React frontend** using **Vite**, with **Tailwind CSS** for styling.

---

## 🧰 Prerequisites

Make sure the following are installed:

* **Python 3.10+**
  👉 [https://www.python.org/downloads/](https://www.python.org/downloads/)

* **Node.js 18+ (LTS recommended)**
  👉 [https://nodejs.org/](https://nodejs.org/)

* **npm** (comes with Node.js)

Verify installation:

```bash
python --version
node --version
npm --version
```

---

## 📁 Project Structure (Recommended)

```text
project-root/
│
├── backend/        # Django project
└── frontend/       # React (Vite) project
```

---

# 🔹 PART 1: Django Backend Setup

---

## 1️⃣ Create Backend Folder

```bash
mkdir backend
cd backend
```

---

## 2️⃣ Create Virtual Environment

```bash
python -m venv venv
```

Activate it:

### Windows

```bash
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

---

## 3️⃣ Install Django

```bash
pip install django
```

Verify:

```bash
django-admin --version
```

---

## 4️⃣ Create Django Project

```bash
django-admin startproject core .
```

Run the server:

```bash
python manage.py migrate
python manage.py runserver
```

Open browser:

```
http://127.0.0.1:8000/
```

✅ Django backend is ready.

---

## 5️⃣ (Optional but Recommended) Install Django REST Framework

```bash
pip install djangorestframework django-cors-headers
```

Add to `core/settings.py`:

```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    ...
]

CORS_ALLOW_ALL_ORIGINS = True
```

---

# 🔹 PART 2: React Frontend (Vite)

---

## 6️⃣ Create Frontend Folder

```bash
cd ..
```

---

## 7️⃣ Create React App Using Vite

Run:

```bash
npm create vite@latest
```

Follow these exact steps:

```text
Need to install the following packages:
create-vite@6.5.0
Ok to proceed? (y) y

Project name:
react-demo

Select a framework:
React

Select a variant:
JavaScript + SWC
```

Then:

```bash
cd react-demo
npm install
npm run dev
```

Open browser:

```
http://localhost:5173/
```

✅ React + Vite is running.

---

# 🔹 PART 3: Install Tailwind CSS (Vite + React)

---

## 8️⃣ Install Tailwind Dependencies

Inside `frontend/react-demo`:

```bash
npm install tailwindcss @tailwindcss/vite
```

---

## 9️⃣ Configure the Vite plugin

### `vite.config.ts`

```js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

---

## 🔟 Add Tailwind to CSS

Edit `src/index.css`:

```css
@import "tailwindcss";
```

---

## 1️⃣1️⃣ Import CSS in `main.jsx`

```js
import './index.css'
```

---

## 1️⃣2️⃣ Test Tailwind

Edit `src/App.jsx`:

```jsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <h1 className="text-4xl font-bold text-blue-600">
        Tailwind is Working 🚀
      </h1>
    </div>
  )
}

export default App
```

Restart dev server if needed:

```bash
npm run dev
```

✅ Tailwind CSS is now working.

---

# 🔹 PART 4: Connect React to Django (API Ready)

---

## 1️⃣3️⃣ Django API Example

Create app:

```bash
cd backend
python manage.py startapp api
```

Add to `INSTALLED_APPS` in `settings.py`:

```python
INSTALLED_APPS = [
    ...
    'rest_framework',
    'corsheaders',
    'api',
]
```

### `api/views.py`

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def hello(request):
    return Response({"message": "Hello from Django"})
```

### `api/urls.py`

```python
from django.urls import path
from .views import hello

urlpatterns = [
    path('hello/', hello),
]
```

### `core/urls.py`

```python
from django.urls import path, include

urlpatterns = [
    path('api/', include('api.urls')),
]
```

---

## 1️⃣4️⃣ Fetch Django API from React

Edit `src/App.jsx`:

```jsx
import { useEffect, useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/hello/")
      .then(res => res.json())
      .then(data => setMessage(data.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <h1 className="text-3xl font-bold">{message}</h1>
    </div>
  );
}

export default App;
```

Run both servers:

```bash
# Backend
python manage.py runserver

# Frontend
npm run dev
```

---

# 🔗 Useful Links

* Django Docs
  👉 [https://docs.djangoproject.com/](https://docs.djangoproject.com/)

* Django REST Framework
  👉 [https://www.django-rest-framework.org/](https://www.django-rest-framework.org/)

* Vite
  👉 [https://vitejs.dev/](https://vitejs.dev/)

* React
  👉 [https://react.dev/](https://react.dev/)

* Tailwind CSS
  👉 [https://tailwindcss.com/docs/installation](https://tailwindcss.com/docs/installation)

---

## ✅ Summary

* Django → Backend API
* React (Vite) → Frontend
* Tailwind → UI Styling
* Fetch API → Connect frontend to backend

This setup is **production-ready** and scalable for JWT auth, permissions, and deployment.

