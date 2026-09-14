# Geschichte Érettségi Trainer

A SvelteKit-based web app for preparing for the Hungarian **középszintű történelem érettségi** in German.

The app focuses on the short-answer section of past exams and does not include essays.

## Features

### Aufgaben

Browse past exam tasks and filter them by:

* Exam year/session
* Historical period
* Topic
* NAT 2020 / 2012 / 2007

### Üben

Practice a randomly selected task. Optionally focus on tasks you haven't practiced before, or 

Answers are graded automatically:

* Multiple choice, matching and similar questions use deterministic grading.
* Open-text answers can be evaluated using AI against the official answer key and marking criteria.

### Prüfung

Take a simulated exam consisting of 12 randomly selected tasks.

Includes:

* Time limit
* Autosaved answers
* Automatic grading
* Final score and detailed results

## Accounts

Users can create an account to save:

* Practice attempts
* Mock exam results
* Answer history
* Progress by historical period/topic

## Tech Stack

* **SvelteKit**
* **TypeScript**
* **Tailwind CSS**
* **PostgreSQL / Supabase**
* **Supabase Auth**
* **Drizzle ORM**
* **Zod**
* **Gemini API** for semantic answer grading
* **Vitest / Playwright**

## Status

Currently in development.

The initial goal is to build a working V1 with:

* Authentication
* Historical exam database
* Aufgaben browser
* Practice mode
* Mock exam mode
* Automatic and AI-assisted grading
* Basic progress statistics
