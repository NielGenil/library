# 📚 Git & GitHub Documentation

A comprehensive guide to Git and GitHub with commands, best practices, commit message conventions, and a visual cheatsheet.

---

## 🔹 Table of Contents

1. [Git Basics](#git-basics)  
2. [GitHub Workflow](#github-workflow)  
3. [Commit Message Conventions](#commit-message-conventions)  
4. [Changing Previous Commits](#changing-previous-commits)  
5. [Git Commands Inside Vim](#git-commands-inside-vim)  
6. [Helpful Git Commands Cheatsheet](#helpful-git-commands-cheatsheet)  
7. [Git Best Practices](#git-best-practices)  
8. [Resources](#resources)  

---

## 🔹 Git Basics

Git is a **distributed version control system** for tracking changes in your code.

### Initialize Git
```bash
git init
````

> Creates a new Git repository in the current folder.

### Clone a Repository

```bash
git clone <repository_url>
```

### Check Status

```bash
git status
```

> Shows changed, staged, and untracked files.

### Add Changes

```bash
git add <file>   # Add a specific file
git add .        # Add all files
```

### Commit Changes

```bash
git commit -m "Your message here"
```

### Push to Remote

```bash
git push origin <branch_name>
```

### Pull from Remote

```bash
git pull origin <branch_name>
```

**Diagram: Basic Git Workflow**

```text
Working Directory --> Staging Area --> Local Repository --> Remote Repository
```

![Git Workflow](https://git-scm.com/images/logos/downloads/Git-Logo-2Color.png)

---

## 🔹 GitHub Workflow

1. Create a repository on GitHub.
2. Clone it locally.
3. Make changes and commit them.
4. Push commits to the repository.
5. Create pull requests for review.

![GitHub Workflow](https://www.atlassian.com/dam/jcr:25aa8f69-d0f5-4046-bf29-718edeb0e1e4/01_git_workflow.png)

---

## 🔹 Commit Message Conventions

Use **Conventional Commits** for readable and maintainable history:

| Type     | Description                             |
| -------- | --------------------------------------- |
| feat     | New feature                             |
| fix      | Bug fix                                 |
| docs     | Documentation changes                   |
| style    | Formatting, whitespace, semicolons      |
| refactor | Code refactoring without new features   |
| perf     | Performance improvements                |
| test     | Adding or modifying tests               |
| chore    | Build process or auxiliary tool changes |
| ci       | Continuous integration changes          |
| revert   | Revert previous commit                  |

**Example Commit Messages**

```bash
git commit -m "feat: add login authentication"
git commit -m "fix: resolve navbar responsiveness"
git commit -m "docs: update README with setup instructions"
```

---

## 🔹 Changing Previous Commits

### Amend Last Commit

```bash
git commit --amend
```

> Opens Vim or default editor to modify the last commit message.

* Add new changes to last commit:

```bash
git add <file>
git commit --amend --no-edit
```

### Edit Commit Message in Vim

1. Press `i` → enter **insert mode**
2. Edit message
3. Press `Esc` → exit insert mode
4. Type `:wq` → save and quit

### Change Older Commits

```bash
git rebase -i HEAD~<number_of_commits>
```

* `pick` → keep commit
* `reword` → edit commit message
* Save and exit Vim to apply changes

---

## 🔹 Helpful Git Commands Cheatsheet

| Command                     | Description                   |
| --------------------------- | ----------------------------- |
| `git log`                   | Show commit history           |
| `git log --oneline --graph` | Compact commit graph          |
| `git branch`                | List branches                 |
| `git checkout <branch>`     | Switch branch                 |
| `git merge <branch>`        | Merge branch into current     |
| `git stash`                 | Save unfinished changes       |
| `git stash apply`           | Reapply stashed changes       |
| `git remote -v`             | Show remote repositories      |
| `git fetch`                 | Download changes from remote  |
| `git reset --hard <commit>` | Reset to specific commit      |
| `git diff`                  | Show file differences         |
| `git status`                | Show working directory status |
| `git add <file>`            | Stage changes                 |
| `git commit -m "message"`   | Commit staged changes         |
| `git push origin <branch>`  | Push changes to remote        |
| `git pull origin <branch>`  | Pull changes from remote      |

---

## 🔹 Git Best Practices

1. Commit frequently with small changes
2. Use meaningful commit messages
3. Keep branches organized and descriptive
4. Pull changes before pushing
5. Use `.gitignore` to exclude unnecessary files

---

## 🔹 Resources

* [Git Official Documentation](https://git-scm.com/doc)
* [GitHub Guides](https://guides.github.com/)
* [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
* [Atlassian Git Tutorials](https://www.atlassian.com/git/tutorials)
