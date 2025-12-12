# useHelper()

werwe `useHelper` is a custom React hook that provides commonly used utilities for your app, including authentication handling (isAuthenticated, isTokenValid, logout, hasPermission) and date/time formatting functions (formatDate, formatTimeMilitary, formattedDateTime).

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
      } catch {
        setIsTokenValid(false);
      }
    };

    checkToken();
  }, [token, verifyToken]);

  const isAuthenticated = !!token;

  const logout = () => {
    Cookies.remove("access");
    Cookies.remove("refresh");
  };

  const hasPermission = (user, perm) => {
    return user?.permissions?.includes(perm);
  }


  const useFormattedDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (isNaN(date)) return dateString; // fallback if invalid

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" }); // 3-letter month
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}


const toMilitaryTime = (timeString) => {
  // If the string has AM/PM, convert properly to 24h format
  const hasAmPm = timeString.toLowerCase().includes("am") || timeString.toLowerCase().includes("pm");

  let date;

  if (hasAmPm) {
    date = new Date(`1970-01-01T${timeString}`);
  } else {
    // Assume 24h HH:MM:SS
    date = new Date(`1970-01-01T${timeString}`);
  }

  // Format to 24h without seconds
  const formatted = date.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Remove colon → "HHMM"
  return formatted.replace(":", "");
};


const useFormattedDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);

  if (isNaN(date)) return dateString; // fallback if invalid

  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day} ${month} ${year} at ${hours}${minutes}`;
}


  
  return { isAuthenticated, logout, isTokenValid, token, hasPermission, formatDate: useFormattedDate, formatTimeMilitary: toMilitaryTime, formattedDateTime: useFormattedDateTime };
}

```
