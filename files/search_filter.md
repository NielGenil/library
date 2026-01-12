Here’s a clean **Markdown-style documentation** you can directly use in your project README or internal docs.

---

# 🔍 Making a Search Filter in React

### Using `useState`, `useQuery`, and `useMemo`

This documentation explains how to implement a **client-side search filter** in React using **React Query** for data fetching and **React hooks** for efficient filtering.

---

## 📦 Technologies Used

* **React**
* **@tanstack/react-query**
* **useState**
* **useMemo**
* **Tailwind CSS** (for styling)

---

## 🎯 Objective

To add a **search bar** that filters a list of positions fetched from an API without making additional API calls.

The search should match:

* Department name
* Section name
* Position name

---

## 📡 Fetching Data with `useQuery`

We use `useQuery` to fetch the position list from the backend.

```jsx
const { data: position } = useQuery({
  queryKey: ["position-list"],
  queryFn: () => getPositionAPI(token),
});
```

### ✅ Why `useQuery`?

* Handles loading & caching automatically
* Prevents unnecessary refetching
* Keeps server-state separate from UI-state

---

## 🧠 Managing Search State with `useState`

We store the user's search input in local state.

```jsx
const [search, setSearch] = useState("");
```

### ✅ Purpose

* Holds the text typed in the search bar
* Triggers filtering when updated

---

## ⚡ Filtering Data Efficiently with `useMemo`

Instead of filtering on every render, we use `useMemo` to recompute the filtered list **only when needed**.

```jsx
const filteredPositions = useMemo(() => {
  if (!position) return [];

  return position.filter((pos) => {
    const searchableText = [
      pos.name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(search.toLowerCase());
  });
}, [position, search]);
```

### ✅ Why `useMemo`?

* Improves performance
* Avoids unnecessary recalculations
* Best for derived data (like filtered lists)

---

## 📝 Search Input UI

The input field captures user input and updates the `search` state.

```jsx
<input
  type="text"
  placeholder="Search position..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  className="
    mb-3 px-3 py-2 text-sm
    border border-gray-300 rounded-md
    focus:outline-none focus:ring-2 focus:ring-blue-500
  "
/>
```

### 🧩 Behavior

* Updates search state on every keystroke
* Automatically re-filters the list

---

## 📃 Rendering the Filtered List

Instead of rendering the full dataset, we render the filtered result.

```jsx
{filteredPositions.map((pos) => (
  <p
    key={pos.id}
    onClick={() => {
      setGroupData(true);
      setPositionId(pos.id);
      setPositionData(pos);
    }}
    className={`
      cursor-pointer px-2 py-2 mb-1 rounded text-xs sm:text-sm
      hover:bg-gray-300 hover:text-white
      ${positionId === pos.id ? "bg-blue-700 text-white" : ""}
    `}
  >
   {pos.name}
  </p>
))}
```

---

## 🔁 Data Flow Summary

```
API (useQuery)
   ↓
Position List
   ↓
useMemo (filter based on search)
   ↓
Filtered List
   ↓
Rendered UI
```

---

## 🏆 Best Practices

* ✅ Use **client-side filtering** for small to medium datasets
* ✅ Use `useMemo` for derived state
* ❌ Avoid filtering directly inside JSX
* ❌ Avoid refetching data for simple searches

---

## 📌 Conclusion

Using `useState`, `useQuery`, and `useMemo` together creates a **fast, clean, and scalable** search filter without additional API calls. This approach keeps UI state and server state properly separated and improves overall performance.

---


