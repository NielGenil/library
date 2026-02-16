Great—this is a **big change** to `useHelper`, so your documentation should reflect that it now:

* **Automatically refreshes tokens**
* **Decodes JWT locally (no verify API call)**
* **Schedules refresh before expiry**
* **Exposes `markTokenInvalid()` for Axios interceptors**
* **Manages token state internally (not just Cookies.get)**

Below is a **clean updated `.md` file** you can replace your old documentation with.

---

# ✅ Updated `useHelper.md`

````md
# `useHelper()` Hook

A reusable custom React hook that centralizes **authentication lifecycle management**, **automatic JWT refresh**, **permission checks**, and **date/time formatting utilities**.

This hook now **actively manages JWT expiration and refresh scheduling**, eliminating the need for manual token verification calls.

---

## Overview

`useHelper()` provides:

- Authentication state management
- Automatic JWT refresh before expiration
- Logout handling
- Manual token invalidation (for Axios interceptors)
- Permission checking helpers
- Date and time formatting utilities

It integrates with:

- React
- js-cookie
- jwt-decode
- Axios
- Django JWT refresh endpoint

---

## Dependencies

```bash
npm install js-cookie jwt-decode axios
````

```js
import { useState, useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
```

---

## Hook Signature

```js
const {
  isAuthenticated,
  isTokenValid,
  token,
  logout,
  markTokenInvalid,
  hasPermission,
  formatDate,
  formatTimeMilitary,
  formattedDateTime,
} = useHelper();
```

---

## Returned Values

### 🔐 Authentication Utilities

| Name                 | Type             | Description                                              |
| -------------------- | ---------------- | -------------------------------------------------------- |
| `token`              | `string \| null` | Current access token stored in state                     |
| `isAuthenticated`    | `boolean`        | `true` if access token exists                            |
| `isTokenValid`       | `boolean`        | Token validity state                                     |
| `logout()`           | `() => void`     | Clears tokens and cancels refresh timers                 |
| `markTokenInvalid()` | `() => void`     | Manually marks token invalid (used by Axios interceptor) |

---

### 🔄 Automatic Token Refresh

* Decodes JWT locally using `jwtDecode`
* Calculates expiration time
* Schedules refresh **1 minute before expiry**
* Refreshes immediately if near expiry
* Removes tokens if refresh fails

---

## Permission Utility

### `hasPermission(user, permission)`

Checks whether a user has a specific permission.

```js
hasPermission(user, "user.add_user");
```

**Parameters**

* `user` – user object containing `permissions` array
* `permission` – permission codename string

**Returns**

* `boolean`

---

## Date & Time Utilities

### `formatDate(dateString)`

Formats a date string into a readable format.

```js
formatDate("2026-01-12");
// → "12 Jan 2026"
```

---

### `formatTimeMilitary(timeString)`

Converts time to **24-hour military format (HHMM)**.

```js
formatTimeMilitary("2:30 PM");
// → "1430"
```

Supports:

* `HH:MM AM/PM`
* `HH:MM:SS` (24-hour)

---

### `formattedDateTime(dateString)`

Formats full datetime strings.

```js
formattedDateTime("2026-01-12T14:30:00");
// → "12 Jan 2026 at 1430"
```

---

## Internal Behavior

### 🔁 Token Lifecycle Flow

1. Reads access token from cookies
2. Decodes JWT to extract expiration time
3. Schedules refresh **60 seconds before expiry**
4. Calls `/api/token/refresh/`
5. Updates cookie + React state
6. Removes tokens if refresh fails or token is expired

---

## Full Implementation

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

## Axios Integration

### `api.js`

```js
import axios from "axios";
import Cookies from "js-cookie";

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

export default api;
```

---

## Example Usage

```js
import { useHelper } from "../hooks/useHelper";
import { setTokenInvalidCallback } from "../api/api";

function App() {
  const { isAuthenticated, isTokenValid, logout, markTokenInvalid } = useHelper();

  useEffect(() => {
    setTokenInvalidCallback(markTokenInvalid);
  }, []);

  if (!isAuthenticated || !isTokenValid) {
    return <Login />;
  }

  return <Dashboard />;
}
```

---

## Notes & Best Practices

* Token refresh is scheduled automatically—**no manual verify call needed**
* Always call `setTokenInvalidCallback(markTokenInvalid)` once in your app root
* `isTokenValid` should be checked before rendering protected routes
* Logout clears timers to prevent memory leaks

---

## Summary

`useHelper()` now acts as a **full JWT lifecycle manager** with proactive refresh, Axios integration, and permission utilities—providing a centralized and production-ready authentication helper for React applications.

```

---

# ✅ If you want
I can also:

- Add **flow diagrams (Mermaid)** to the markdown  
- Create a **README-friendly shorter version**  
- Add **TypeScript types version of docs**  
- Document **React ProtectedRoute example**  
- Add **SSR-safe Next.js notes**  

Just tell me your preferred style.
```
