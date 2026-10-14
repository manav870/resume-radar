# 🏆 GradeFlow — Hackathon Presentation Guide & Cheat Sheet

> **One-Liner:** GradeFlow transforms hours of repetitive, subjective grading into seconds of consistent, deeply diagnostic feedback delivered straight into Google Docs.

---

## 📌 Table of Contents
1. [The 30-Second Elevator Pitch](#1-the-30-second-elevator-pitch)
2. [The Problem vs. GradeFlow Solution](#2-the-problem-vs-gradeflow-solution)
3. [System Architecture & Workflow](#3-system-architecture--workflow)
4. [The 4-Dimensional Diagnostic Rubric](#4-the-4-dimensional-diagnostic-rubric)
5. [Technical Stack & Engineering Highlights](#5-technical-stack--engineering-highlights)
6. [2-Minute Live Demo Script](#6-2-minute-live-demo-script)
7. [Anticipated Judge Q&A](#7-anticipated-judge-qa)

---

## 1. The 30-Second Elevator Pitch

> *"Grading assignments is one of the biggest bottlenecks for educators. When teachers have to evaluate dozens or hundreds of submissions, feedback inevitably becomes rushed, inconsistent, or reduced to just a simple score.*
>
> ***GradeFlow** solves this with an automated AI pipeline: teachers drop student assignments into a Google Drive folder, and GradeFlow uses Google Gemini to evaluate each submission against a rigorous 4-dimensional rubric. It identifies specific misconceptions, quotes what the student wrote, explains why it's wrong, provides the correction, and appends the complete diagnostic report directly into a shared Google Doc — all in a single click."*

---

## 2. The Problem vs. GradeFlow Solution

| Problem (Manual Grading) | GradeFlow Solution |
| :--- | :--- |
| **Hours spent reading line-by-line** for dozens of students | **Batch grades an entire folder** in seconds |
| **Vague feedback** (*"Good job"*, *"Add more detail"*) | **Diagnostic error analysis** (*What was written, Why it's wrong, How to fix it*) |
| **Grading fatigue & bias** (students graded late at night get worse feedback) | **Standardized 4-dimension rubric** applied equally to every student |
| **Scattered platforms** requiring students to log in to new tools | **Native Google Workspace integration** (Google Drive & Google Docs) |

---

## 3. System Architecture & Workflow

```
+-------------------------------------------------------------------------+
|                              GRADEFLOW PIPELINE                         |
+-------------------------------------------------------------------------+

  [ Google Drive Folder ]
         |
         |  (1) List & read assignment files (e.g., 27_Mohan.txt)
         v
  [ Express.js Backend ] <------> [ Web Dashboard ]
         |                        (Grade / Home / Guide)
         |
         |  (2) Structured prompt with 4-criterion rubric
         v
  [ Google Gemini AI ]
         |
         |  (3) Strict JSON schema evaluation & error diagnosis
         v
  [ Express.js Backend ]
         |
         |  (4) Parse roll number & student name from filename
         |      Append formatted diagnostic report
         v
  [ Shared Google Doc ]  <======  Ready for Teacher & Student Review!
```

### The 4-Step Pipeline:
1. **File Ingestion (`driveService.js`)**: Connects via a Google Service Account to list files in the assignment folder and extracts raw text from `.txt` or Google Docs.
2. **Metadata Extraction (`docsService.js`)**: Automatically parses student details from naming conventions (e.g., `27_Mohan.txt` $\rightarrow$ Roll Number: `27`, Name: `Mohan`).
3. **AI Evaluation (`geminiService.js`)**: Sends the assignment to Gemini with a strict JSON schema prompt to assess performance across 4 rubric dimensions.
4. **Report Generation (`docsService.js`)**: Appends an evaluation report into the target Google Doc using atomic `batchUpdate` inserts.

---

## 4. The 4-Dimensional Diagnostic Rubric

Every student submission is evaluated against this structured standard:

### 1. Criterion Breakdown (Score: /20)
* **Clarity & Structure (1–5)**: Logical flow, argument coherence, readability.
* **Factual Accuracy (1–5)**: Correctness of domain terminology, equations, concepts.
* **Completeness (1–5)**: Coverage of all required parts of the question.
* **Conceptual Depth (1–5)**: Critical thinking, understanding of core principles.

### 2. Error Analysis & Corrections (The "Learning Gap" Section)
Instead of just marking an answer wrong, GradeFlow extracts:
- **Error Name**: Specific misconception identified.
- **What Was Written**: Direct quote or summary of the student's submission.
- **Why It Is Incorrect**: Conceptual breakdown of why the reasoning fails.
- **Correction / Better Approach**: The exact correct way to approach the problem.

### 3. Hidden Assumptions & Missed Opportunities
- Reveals unstated assumptions the student relied on.
- Highlights alternative, more optimal methods the student missed.

### 4. Actionable Next Step
- **Core Principle to Review**: Specific textbook concept to revisit.
- **Targeted Practice**: One precise practice exercise designed to fix the flaw.

---

## 5. Technical Stack & Engineering Highlights

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | Node.js + Express | REST API & static file serving on port 8080 |
| **AI Model** | Google Gemini | Generates rubric diagnostics & error corrections |
| **Cloud Storage** | Google Drive API v3 | Reads assignment files from teacher's folder |
| **Document Output**| Google Docs API v1 | Appends formatted evaluation reports live |
| **Auth** | Google Service Account | Headless, server-to-server OAuth authentication |
| **Frontend** | Vanilla HTML5 / CSS3 / JS | Lightweight, high-performance, zero framework bloat |
| **Design System**| Warm Paper Aesthetic | Bricolage Grotesque + Inter typography, terracotta accents |
| **Automation** | `run.bat` | One-click setup: checks Node, installs deps, launches browser |

### Key Engineering Decisions:
- **Multi-Model Failover & Exponential Backoff**: Prevents `503 Service Unavailable` or `429 Rate Limit` issues by automatically retrying across models (`gemini-flash-lite-latest`, `gemini-3.1-flash-lite`, `gemini-2.5-flash`).
- **Constrained JSON Output**: Uses Gemini's `responseMimeType: "application/json"` to guarantee machine-parsable, deterministic outputs.
- **Unified Server**: Express serves both API and UI, eliminating CORS friction and multi-port confusion.

---

## 6. 2-Minute Live Demo Script

### Step 1: Open on Landing Page (15 seconds)
1. Double-click `run.bat` to launch the server and browser at `http://localhost:8080`.
2. **Say**: *"We built GradeFlow with a warm, distraction-free interface for educators, complete with dark and light modes."*

### Step 2: Show the Project Guide (20 seconds)
1. Click **"How It Works"** (`/guide.html`) in the top navigation.
2. Point out the **"Before vs. After"** comparison cards:
   - *"Before GradeFlow: Reading line-by-line, spending hours on grading."*
   - *"With GradeFlow: Automated 4-dimension scoring, error quotes, and corrections in minutes."*

### Step 3: Trigger Batch Evaluation (45 seconds)
1. Click **"Start Grading"** (`/grade.html`).
2. Paste the **Assignment Folder ID** and **Feedback Doc ID**.
3. Set files to process (e.g., `1` or `2`).
4. Click **"Generate Batch Feedback"**.
5. **Say**: *"Under the hood, GradeFlow fetches the files from Drive, streams the text to Gemini with our structured diagnostic prompt, parses student names from filenames, and writes the report directly to Google Docs."*

### Step 4: Show the Google Docs Output (40 seconds)
1. The dashboard displays the live summary cards (**Total Processed**, **Successful**, **Score**).
2. Click **"Open Feedback →"** to open the target Google Doc.
3. Show the judges:
   - **Roll No** and **Student Name** parsed automatically.
   - **Section 2 (Error Analysis)** where the AI quoted the student and gave the exact correction.
   - **Section 4 (Actionable Next Step)** giving targeted practice.

---

## 7. Anticipated Judge Q&A

### Q1: "What if Gemini hallucinates or gives inaccurate feedback?"
> **Answer**: *"We mitigate hallucination in three ways: First, we constrain the output using Gemini's `responseMimeType: 'application/json'` with a strict schema. Second, we require the model to explicitly quote 'what was written' before evaluating why it's wrong, anchoring feedback directly to the student's text. Third, we have automated validators so if any output fails to parse, it falls back gracefully rather than displaying corrupted data."*

### Q2: "Why output to Google Docs instead of just the web dashboard?"
> **Answer**: *"Google Docs is where teachers and students already work. By outputting to Docs, teachers can edit, add comments, print, or share the document directly without forcing students or schools to adopt a new software platform."*

### Q3: "How does this scale to a class of 100 students?"
> **Answer**: *"Our batch orchestrator handles files iteratively with throttling delays to prevent API rate limits. For enterprise scale, the processing can easily be offloaded to a background queue (like BullMQ or Google Cloud Tasks) running on Cloud Run."*

### Q4: "What happens if a student uploads an empty file or corrupt format?"
> **Answer**: *"The system validates file content before calling Gemini. If a file is blank or unsupported, it marks it as 'Skipped' with a clear diagnostic message in the results table without halting the rest of the batch."*
