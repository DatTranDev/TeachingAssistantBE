# 1. Product Overview

## What Problem It Solves

Teaching Assistant is a classroom management platform designed to digitize and streamline interactions between lecturers and students during and between class sessions. It replaces manual processes — paper roll-calls, verbal Q&A, paper feedback — with a mobile-first, real-time system.

## Target Users

- **Lecturers (Teachers):** Manage classes, record attendance, post materials, run discussions, view feedback statistics
- **Students:** Check in to classes, ask questions, review sessions, participate in group activities

## Role of Each System

| Component | Role |
|---|---|
| Backend (Express.js + MongoDB) | Core API server, business logic, WebSocket hub, Firebase integration gateway |
| Mobile App (Expo / React Native) | Primary user interface for both roles — all user interactions flow through the mobile app |
