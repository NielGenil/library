# Instructions: Find and Kill Memurai Port on Windows

Follow these steps to identify the port Memurai is using and force-close the process via Command Prompt.

### 1. Identify the Process ID (PID)
Open **Command Prompt** (Run as Administrator) and type the following command to find which process is using the Memurai port (Default: **6379**):

```cmd
netstat -ano | findstr :6379
```

*   **Note:** If you changed your port, replace `6379` with your custom port number.
*   **The Result:** Look at the far right column. That number is your **PID** (e.g., `1234`).

---

### 2. Kill the Process
Using the **PID** you found in the previous step, run the following command to terminate the service:

```cmd
taskkill /PID <PID_NUMBER> /F
```

*   *Example:* `taskkill /PID 1234 /F`
*   The `/F` flag forces the process to stop immediately.

---

### 3. Alternative: Kill by Image Name
If you prefer to stop the process by its name without looking up the PID, use this command:

```cmd
taskkill /IM memurai.exe /F
```

---

### Verification
To confirm the port is free, run the `netstat` command from Step 1 again. If no results return, the port is successfully cleared.
