
# Using TanStack Query for Fetching, Creating, Updating, and Deleting Data

This document explains how **TanStack Query (`@tanstack/react-query`)** is used to:

* Fetch the currently authenticated user
* Submit a leave application using a mutation
* Handle loading, success, and error states
* Keep server data in sync using query invalidation

---

## Prerequisites

Ensure the following are installed and configured:

```bash
npm install @tanstack/react-query
```

Your app must be wrapped with `QueryClientProvider`:

```jsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```

---

## Fetching Current User Data (`useQuery`)

### Purpose

`useQuery` is used to **retrieve the currently logged-in user** from the backend using a JWT token.

---

### API Function

```js
export const getCurrentUserAPI = async (token) => {
  const response = await fetch(`${BASE_URL}/api/current-user/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  return await response.json();
};
```

---

### Query Usage

```js
const { data: user } = useQuery({
  queryKey: ["user-data"],
  queryFn: () => getCurrentUserAPI(token),
});
```

---

### Explanation

| Property     | Description                                     |
| ------------ | ----------------------------------------------- |
| `queryKey`   | Unique identifier for caching (`["user-data"]`) |
| `queryFn`    | Function that fetches data from the API         |
| `data: user` | The resolved user data from the server          |

TanStack Query automatically:

* Caches the response
* Prevents unnecessary refetches
* Handles loading and error states internally

---

## Submitting Leave Application (`useMutation`)

### Purpose

`useMutation` is used for **creating or updating server-side data**, in this case submitting a leave request.

---

### Mutation Setup

```js
const { mutate: postLeave, isPending: isPostLeave } = useMutation({
  mutationFn: (leaveData) => postLeaveAPI(leaveData, token),

  onSuccess: (data) => {
    console.log("Success", data);
    toast.success("Your leave application has been successfully filed!");
    queryClient.invalidateQueries(["user-leave-list"]);
    close(false);
  },

  onError: (error) => {
    console.error("Error", error);
    const errorMessage = error?.error || JSON.stringify(error);
    toast.error(`Error Leave Filing: ${errorMessage}`);
  },
});
```

---

### Explanation

| Property     | Description                             |
| ------------ | --------------------------------------- |
| `mutationFn` | Function that sends data to the backend |
| `onSuccess`  | Runs after a successful request         |
| `onError`    | Handles API or validation errors        |
| `isPending`  | Boolean state for loading/disabled UI   |

---

### Query Invalidation

```js
queryClient.invalidateQueries(["user-leave-list"]);
```

This forces React Query to **refetch the leave list**, ensuring the UI reflects the newly submitted leave.

---

## Handling Form Submission with `FormData`

### Purpose

Form data is collected using a `ref` and submitted through the mutation.

---

### Submit Handler

```js
const postLeaveSubmit = (e) => {
  e.preventDefault();

  const leaveData = new FormData(leaveFormRef.current);
  console.log("DATA", leaveData);

  if (selectedPersonnelPayApproval === "personnel_with_pay") {
    leaveData.set("personnel_with_pay", true);
    leaveData.set("personnel_without_pay", false);
  } else if (selectedPersonnelPayApproval === "personnel_without_pay") {
    leaveData.set("personnel_with_pay", false);
    leaveData.set("personnel_without_pay", true);
  }

  postLeave(leaveData);
};
```

---

### Key Notes

* `FormData` allows file uploads and multipart requests
* `.set()` ensures correct boolean values are sent
* `postLeave(leaveData)` triggers the mutation

---

## UI State Handling

You can use `isPostLeave` to disable buttons or show loaders:

```jsx
<button disabled={isPostLeave}>
  {isPostLeave ? "Submitting..." : "Submit Leave"}
</button>
```

---

## Why Use TanStack Query?

✔ Automatic caching
✔ Built-in loading & error handling
✔ Server state synchronization
✔ Cleaner API logic
✔ Less manual state management

---

## Summary

This setup uses:

* `useQuery` for **fetching authenticated user data**
* `useMutation` for **submitting leave applications**
* `FormData` for flexible payload handling
* `invalidateQueries` to keep UI data consistent

This pattern is **scalable, maintainable, and production-ready** for modern React applications.

---
