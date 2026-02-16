## Overview

This documentation explains how to implement **server-side pagination** using **Django REST Framework (DRF)** and consume it in **React** using **React Query**, including dynamic pagination controls.

Pagination helps improve performance by loading data in chunks instead of fetching all records at once.

---

# 🧩 Backend (Django REST Framework)

## 1️⃣ Create a Custom Pagination Class

Create a pagination utility file (e.g., `apps_pagination_data.py`):

```python
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class AppPagination(PageNumberPagination):
    # Default number of records per page
    page_size = 50

    # Allow frontend to override page size using query param
    page_size_query_param = 'page_size'

    # Maximum records per page
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'total_records': self.page.paginator.count,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'results': data
        })
```

---

## 2️⃣ Apply Pagination in Django View

```python
# views.py
from rest_framework import generics
from .models import Attendance
from .serializers import AttendanceViewSerializer
from .apps_pagination_data import AppPagination

class AllAttendanceListView(generics.ListAPIView):
    queryset = Attendance.objects.all().order_by('-date')
    serializer_class = AttendanceViewSerializer
    pagination_class = AppPagination # Apply Pagination to views
```

---

## 3️⃣ Example API Response Format

When requesting:

```
GET /api/all-attendance-list/?page=1
```

Response:

```json
{
  "links": {
    "next": "http://localhost:8000/api/all-attendance-list/?page=2",
    "previous": null
  },
  "total_records": 1250,
  "total_pages": 25,
  "current_page": 1,
  "results": [
    { "id": 1, "user": {...}, "date": "2026-02-16" }
  ]
}
```

---

# ⚛️ Frontend (React)

## 4️⃣ Fetch Paginated Data with React Query

```js
const [page, setPage] = useState(1);

const { data } = useQuery({
  queryKey: ["all-attendance-list", page],
  queryFn: () => getAllAttendance(token, page),
});
```

---

## 5️⃣ API Fetch Function

```js
export const getAllAttendance = async (token, page = 1) => {
  const response = await fetch(
    `${BASE_URL}/api/all-attendance-list/?page=${page}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw await response.json();
  }

  return await response.json();
};
```

---

## 6️⃣ Render Table Data

⚠️ **Important:** Because DRF pagination wraps results inside `results`, you must map `data.results`.

```js
<tbody className="divide-y divide-gray-200">
  {data?.results?.map((attendance) => (
    <tr key={attendance.id} className="hover:bg-gray-50 transition text-xs sm:text-sm">
      <td className="px-6 py-4">{attendance.user.employee_id}</td>
      <td className="px-6 py-4">
        {attendance.user.first_name} {attendance.user.last_name}
      </td>
      <td className="px-6 py-4">{useFormattedDate(attendance.date)}</td>
      <td className="px-6 py-4 text-green-700">{formatTime(attendance.time_in)}</td>
      <td className="px-6 py-4 text-red-700">
        {formatTime(attendance.time_out ?? "-")}
      </td>
      <td className="px-6 py-4">
        {attendance.overtime_hours || "-"}
      </td>
      <td className="px-6 py-4">
        {attendance.total_hours || "-"}
      </td>
    </tr>
  ))}
</tbody>
```

---

# 📌 Pagination Controls UI

## 7️⃣ Pagination Buttons (Prev, Next, Page Numbers)

```js
{data && (
  <div className="flex justify-center items-center mt-4 space-x-2 text-sm text-gray-700">
    
    {/* Previous */}
    <button
      onClick={() => setPage((p) => Math.max(p - 1, 1))}
      disabled={!data.links.previous}
      className={`px-3 py-1 rounded-md border ${
        data.links.previous ? "bg-white" : "bg-gray-200 cursor-not-allowed"
      }`}
    >
      Prev
    </button>

    {/* Page Numbers */}
    {Array.from({ length: data.total_pages }, (_, i) => i + 1).map((n) => (
      <button
        key={n}
        onClick={() => setPage(n)}
        disabled={n === page}
        className={`px-3 py-1 rounded-md border ${
          n === page ? "bg-gray-800 text-white" : "bg-white"
        }`}
      >
        {n}
      </button>
    ))}

    {/* Next */}
    <button
      onClick={() => setPage((p) => Math.min(p + 1, data.total_pages))}
      disabled={!data.links.next}
      className={`px-3 py-1 rounded-md border ${
        data.links.next ? "bg-white" : "bg-gray-200 cursor-not-allowed"
      }`}
    >
      Next
    </button>
  </div>
)}
```

---

# ✅ How Pagination Works (Flow)

1. React sends request with `?page=1`
2. Django returns paginated JSON with metadata
3. React displays table using `data.results`
4. User clicks page → `setPage(n)`
5. React Query refetches new page automatically

---

