# Table Filtering with Dropdowns

A step-by-step guide on how to implement dropdown filters on a data table using React Query.

---

## Overview

This guide walks you through filtering table data using a dropdown select input. The filter is applied client-side after fetching data from an API, meaning no extra API calls are made when the user changes the filter.

**The flow looks like this:**

```
Fetch Data → Store in State → Apply Filter Logic → Render Filtered Table
```

---

## Step 1 — Fetch the Table Data

Use `useQuery` from React Query to fetch your task list from the API.

```js
const { data: taskList } = useQuery({
  queryKey: ["task-list"],
  queryFn: () => getTaskDataAPI(token, projectId),
});
```

| Part | Description |
|---|---|
| `queryKey` | A unique key React Query uses to cache this request |
| `queryFn` | The function that calls your API |
| `data: taskList` | The response data returned from the API |

---

## Step 2 — Set Up the Filter State

Declare a state variable to track the currently selected filter value. An empty string `""` means **no filter is applied** (show all).

```js
const [statusFilter, setStatusFilter] = useState("");
```

---

## Step 3 — Normalize the Data & Apply the Filter

Before filtering, make sure the data is always an array to avoid runtime errors. Then apply the filter logic.

```js
// Ensure taskList.tasks is always an array
const taskListData = Array.isArray(taskList?.tasks) ? taskList?.tasks : [];

// Filter the array based on the selected status
const filteredTasks = taskListData.filter((task) => {
  const matchStatus =
    statusFilter === "" || task.task_status === statusFilter;

  return matchStatus;
});
```

**How the filter logic works:**

- If `statusFilter` is `""` (empty) → `matchStatus` is `true` → **all tasks pass through**
- If `statusFilter` is `"In Progress"` → only tasks where `task.task_status === "In Progress"` pass through

> **Tip:** To add more filters (e.g. priority, assignee), simply declare more state variables and add more conditions inside `.filter()`.

---

## Step 4 — Add the Dropdown UI

Render a `<select>` element that updates `statusFilter` whenever the user picks an option.

```jsx
<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
  className="p-2 border-gray-300 border rounded-md w-full"
>
  <option value="">All Status</option>
  <option value="To Do">To Do</option>
  <option value="In Progress">In Progress</option>
  <option value="Done">Done</option>
</select>
```

| Part | Description |
|---|---|
| `value={statusFilter}` | Keeps the dropdown in sync with state (controlled input) |
| `onChange` | Updates `statusFilter` with the selected option's value |
| `value=""` on the first option | Represents the "no filter" / show-all state |

---

## Step 5 — Render the Filtered Table

Loop over `filteredTasks` instead of the original raw data to render only the matching rows.

```jsx
{filteredTasks?.map((task) => (
  <tr key={task.id}>
    {/* render your table cells here */}
  </tr>
))}
```

---

## Step 6 — Handle the Empty State

If no tasks match the current filter, show a friendly message instead of an empty table.

```jsx
{filteredTasks.length === 0 && (
  <tr>
    <td colSpan={5} className="text-center py-4 text-gray-500">
      No tasks found
    </td>
  </tr>
)}
```

> Set `colSpan` to match the total number of columns in your table so the message spans the full width.

---

## Complete Flow Summary

```
1. useQuery fetches tasks from the API
         ↓
2. useState holds the current filter value (default: "")
         ↓
3. .filter() compares each task's status to the filter value
         ↓
4. <select> dropdown lets the user change the filter
         ↓
5. filteredTasks renders in the table
         ↓
6. Empty state message shows if filteredTasks.length === 0
```

---

## Adding More Filters

To extend this pattern with additional filters, follow the same steps for each new filter:

```js
// 1. Add a new state
const [priorityFilter, setPriorityFilter] = useState("");

// 2. Add a new condition inside .filter()
const filteredTasks = taskListData.filter((task) => {
  const matchStatus = statusFilter === "" || task.task_status === statusFilter;
  const matchPriority = priorityFilter === "" || task.priority === priorityFilter;

  return matchStatus && matchPriority;
});

// 3. Add a new <select> dropdown in your JSX
<select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
  <option value="">All Priorities</option>
  <option value="Low">Low</option>
  <option value="High">High</option>
</select>
```
