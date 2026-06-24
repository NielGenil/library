# SQL Basic Commands — Reference Guide

A concise reference for writing SQL queries, from simple data retrieval to multi-table joins and aggregations.

---

## Table of Contents

1. [Selecting Data](#1-selecting-data)
2. [Filtering with WHERE](#2-filtering-with-where)
3. [Sorting and Limiting Results](#3-sorting-and-limiting-results)
4. [Joining Tables](#4-joining-tables)
5. [Handling NULLs](#5-handling-nulls)
6. [Expressions and Aliases](#6-expressions-and-aliases)
7. [Aggregate Functions](#7-aggregate-functions)
8. [Grouping and Filtering Groups](#8-grouping-and-filtering-groups)
9. [Query Execution Order](#9-query-execution-order)

---

## 1. Selecting Data

Use `SELECT` to retrieve data from a table.

**Retrieve all columns:**
```sql
SELECT *
FROM myTable;
```

**Retrieve specific columns:**
```sql
SELECT column1, column2
FROM myTable;
```

---

## 2. Filtering with WHERE

Use `WHERE` to filter rows based on one or more conditions.

```sql
SELECT *
FROM myTable
WHERE id >= 10;
```

### Numeric Operators

| Operator | Condition | Example |
|---|---|---|
| `=`, `!=`, `<`, `<=`, `>`, `>=` | Standard numerical comparison | `col_name != 4` |
| `BETWEEN … AND …` | Value is within a range (inclusive) | `col_name BETWEEN 1.5 AND 10.5` |
| `NOT BETWEEN … AND …` | Value is outside a range (inclusive) | `col_name NOT BETWEEN 1 AND 10` |
| `IN (…)` | Value exists in a list | `col_name IN (2, 4, 6)` |
| `NOT IN (…)` | Value does not exist in a list | `col_name NOT IN (1, 3, 5)` |

### String Operators

| Operator | Condition | Example |
|---|---|---|
| `=` | Case-sensitive exact match | `col_name = "abc"` |
| `!=` or `<>` | Case-sensitive inequality | `col_name != "abcd"` |
| `LIKE` | Case-insensitive exact match | `col_name LIKE "ABC"` |
| `NOT LIKE` | Case-insensitive inequality | `col_name NOT LIKE "ABCD"` |
| `%` | Wildcard: matches zero or more characters (used with `LIKE`) | `col_name LIKE "%AT%"` → matches `"AT"`, `"ATTIC"`, `"CAT"`, `"BATS"` |
| `_` | Wildcard: matches exactly one character (used with `LIKE`) | `col_name LIKE "AN_"` → matches `"AND"`, not `"AN"` |
| `IN (…)` | String exists in a list | `col_name IN ("A", "B", "C")` |
| `NOT IN (…)` | String does not exist in a list | `col_name NOT IN ("D", "E", "F")` |

---

## 3. Sorting and Limiting Results

**Remove duplicates with `DISTINCT` and sort with `ORDER BY`:**
```sql
SELECT DISTINCT column1
FROM myTable
ORDER BY column1 ASC;  -- Use DESC for descending order
```

**Limit the number of rows returned and skip rows with `OFFSET`:**
```sql
SELECT *
FROM myTable
LIMIT 3 OFFSET 5;  -- Returns 3 rows, starting from the 6th row
```

> **Tip:** `LIMIT` controls how many rows are returned. `OFFSET` determines how many rows to skip before starting the result set — useful for pagination.

---

## 4. Joining Tables

Joins combine rows from two or more tables based on a related column.

### INNER JOIN
Returns only rows where there is a match in **both** tables.

```sql
SELECT *
FROM table1
INNER JOIN table2
    ON table1.id = table2.id;
```

### LEFT JOIN
Returns **all rows from the left table**, plus matched rows from the right. Unmatched rows from the right table appear as `NULL`.

### RIGHT JOIN
Returns **all rows from the right table**, plus matched rows from the left. Unmatched rows from the left table appear as `NULL`.

### FULL JOIN
Returns **all rows from both tables**, regardless of whether a match exists. Unmatched rows on either side appear as `NULL`.

| Join Type | Returns |
|---|---|
| `INNER JOIN` | Rows with matches in both tables |
| `LEFT JOIN` | All rows from the left table + matches from the right |
| `RIGHT JOIN` | All rows from the right table + matches from the left |
| `FULL JOIN` | All rows from both tables |

---

## 5. Handling NULLs

Use `IS NULL` or `IS NOT NULL` to filter rows where a value is missing. This is particularly useful after a `LEFT JOIN` to find unmatched rows.

**Find rows in `table1` with no match in `table2`:**
```sql
SELECT *
FROM table1
LEFT JOIN table2
    ON table1.column1 = table2.column1
WHERE table2.column1 IS NULL;
```

> **Note:** `NULL` represents a missing or unknown value. Standard comparison operators (e.g., `= NULL`) do not work — always use `IS NULL` or `IS NOT NULL`.

---

## 6. Expressions and Aliases

Use arithmetic expressions in `SELECT` to compute derived values. Use `AS` to give the result a readable name (alias).

```sql
SELECT
    column1table1,
    (column1table2 + column2table2) / 1000000 AS gross_sales_millions
FROM table1
JOIN table2
    ON table1.id = table2.movie_id;
```

> **Tip:** Aliases improve readability and are reusable in `ORDER BY` clauses.

---

## 7. Aggregate Functions

Aggregate functions perform calculations across a set of rows and return a single value. They are commonly used with `GROUP BY`.

| Function | Description |
|---|---|
| `COUNT(*)` | Counts all rows in the group |
| `COUNT(column)` | Counts rows with non-NULL values in the specified column |
| `MIN(column)` | Returns the smallest value in the column |
| `MAX(column)` | Returns the largest value in the column |
| `AVG(column)` | Returns the average value of the column |
| `SUM(column)` | Returns the total sum of the column |

**Example — total sales per category:**
```sql
SELECT column1, SUM(column2) AS total_sales
FROM myTable
GROUP BY column1;
```

---

## 8. Grouping and Filtering Groups

Use `GROUP BY` to group rows that share a value, then use `HAVING` to filter those groups — similar to how `WHERE` filters individual rows.

```sql
SELECT column1, SUM(column2) AS total_sales
FROM myTable
WHERE column1 LIKE "%En%"   -- Filters rows before grouping
GROUP BY column1
HAVING total_sales > 1000;  -- Filters groups after aggregation
```

> **Key difference:** `WHERE` filters rows **before** grouping. `HAVING` filters groups **after** aggregation.

---

## 9. Query Execution Order

SQL clauses are written in a specific order but executed in a different sequence. Understanding this helps avoid common errors.

**Full SELECT syntax:**
```sql
SELECT DISTINCT column, AGG_FUNC(column_or_expression) AS alias
FROM mytable
    JOIN another_table
        ON mytable.column = another_table.column
WHERE constraint_expression
GROUP BY column
HAVING constraint_expression
ORDER BY column ASC/DESC
LIMIT count OFFSET count;
```

**Execution order:**

| Order | Clause | Purpose |
|---|---|---|
| 1 | `FROM` / `JOIN` | Identify and combine source tables |
| 2 | `WHERE` | Filter individual rows |
| 3 | `GROUP BY` | Group rows by a column |
| 4 | `HAVING` | Filter grouped results |
| 5 | `SELECT` | Select and compute columns |
| 6 | `DISTINCT` | Remove duplicate rows |
| 7 | `ORDER BY` | Sort the results |
| 8 | `LIMIT` / `OFFSET` | Restrict the number of rows returned |

**Example putting it all together:**
```sql
SELECT column1table1, (column1table2 + column2table2) AS combined_value
FROM table1
JOIN table2
    ON table1.table1_id = table2.table2_id
GROUP BY column1table1;
```

---

*End of SQL Basic Commands Reference*
