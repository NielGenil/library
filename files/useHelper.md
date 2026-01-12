# `useHelper()` Hook

A reusable custom React hook that centralizes **authentication utilities**, **permission checks**, and **date/time formatting helpers**. This hook is designed to reduce duplication and provide a consistent set of helper functions across the application.

---

## Overview

`useHelper()` provides:

* Authentication state helpers
* JWT token validation
* Logout handling
* Permission checking
* Common date and time formatting utilities

It integrates with **React**, **TanStack Query**, **js-cookie**, and your backend token verification API.

---

## Dependencies

```bash
npm install js-cookie @tanstack/react-query
```

```js
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { verifyTokenAPI } from "../api/api";
```

---

## Hook Signature

```js
const {
  isAuthenticated,
  isTokenValid,
  token,
  logout,
  hasPermission,
  formatDate,
  formatTimeMilitary,
  formattedDateTime,
} = useHelper();
```

---

## Returned Values

### Authentication Utilities

| Name              | Type                  | Description                                     |
| ----------------- | --------------------- | ----------------------------------------------- |
| `token`           | `string \| undefined` | JWT access token retrieved from cookies         |
| `isAuthenticated` | `boolean`             | `true` if an access token exists                |
| `isTokenValid`    | `boolean \| null`     | Token validation status (`null` while checking) |
| `logout()`        | `() => void`          | Clears access and refresh tokens from cookies   |

---

### Permission Utility

#### `hasPermission(user, permission)`

Checks whether a user has a specific permission.

```js
hasPermission(user, "user.add_user");
```

**Parameters**

* `user` – user object containing a `permissions` array
* `permission` – permission codename to check

**Returns**

* `boolean`

---

### Date & Time Utilities

#### `formatDate(dateString)`

Formats a date string into a human-readable format.

```js
formatDate("2026-01-12");
// → "12 Jan 2026"
```

---

#### `formatTimeMilitary(timeString)`

Converts a time string into **24-hour military format (HHMM)**.

```js
formatTimeMilitary("2:30 PM");
// → "1430"
```

Supports both:

* `HH:MM AM/PM`
* `HH:MM:SS` (24-hour format)

---

#### `formattedDateTime(dateString)`

Formats a full datetime string including date and time.

```js
formattedDateTime("2026-01-12T14:30:00");
// → "12 Jan 2026 at 1430"
```

---

## Internal Behavior

### Token Validation Flow

* Reads the access token from cookies
* Automatically verifies the token using `verifyTokenAPI`
* Updates `isTokenValid` state based on API response
* Falls back to `false` if verification fails or token is missing

Token verification runs automatically on:

* Initial mount
* Token change

---

## Full Implementation

```js
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { verifyTokenAPI } from "../api/api";

export function useHelper() {
  const token = Cookies.get("access");
  const [isTokenValid, setIsTokenValid] = useState(null);

  const { mutateAsync: verifyToken } = useMutation({
    mutationFn: verifyTokenAPI,
  });

  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setIsTokenValid(false);
        return;
      }

      try {
        const res = await verifyToken(token);
        if (res?.code === "token_not_valid") {
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      } catch (error) {
        setIsTokenValid(false);
      }
    };

    checkToken();
  }, [token, verifyToken]);

  const isAuthenticated = Boolean(token);

  const logout = () => {
    Cookies.remove("access");
    Cookies.remove("refresh");
  };

  const hasPermission = (user, permission) => {
    return user?.permissions?.includes(permission);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  };

  const formatTimeMilitary = (timeString) => {
    if (!timeString) return "";
    const date = new Date(`1970-01-01T${timeString}`);

    const formatted = date.toLocaleTimeString("en-GB", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    return formatted.replace(":", "");
  };

  const formattedDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("en-US", { month: "short" });
    const year = date.getFullYear();

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");

    return `${day} ${month} ${year} at ${hours}${minutes}`;
  };

  return {
    token,
    isAuthenticated,
    isTokenValid,
    logout,
    hasPermission,
    formatDate,
    formatTimeMilitary,
    formattedDateTime,
  };
}
```

---

## Example Usage

```js
import { useHelper } from "../hooks/useHelper";

function Dashboard({ user }) {
  const { isAuthenticated, isTokenValid, logout, hasPermission } = useHelper();

  if (!isAuthenticated || isTokenValid === false) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
      {hasPermission(user, "dashboard.view") && <DashboardContent />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Notes & Best Practices

* `isTokenValid` starts as `null`; always account for the loading state
* Permission checks assume permissions are stored as strings in `user.permissions`
* Date utilities safely fall back if an invalid date is provided

---

## Summary

`useHelper()` consolidates frequently used logic into a single, predictable API. It improves maintainability, enforces consistency, and simplifies authentication and formatting logic across your React application.
