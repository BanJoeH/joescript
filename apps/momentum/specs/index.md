# momentum.joescript.io

# Vision

## Purpose

**momentum** is a personal workout journal.

It helps you become more consistent by remembering more than just sets and reps.

Most workout apps answer:

> What did I do?

momentum also answers:

> How did it feel?

> Was it worth it?

> What keeps me coming back?

The goal isn't to maximise volume or performance.

The goal is to make it easier to decide to exercise today.

---

# Philosophy

The biggest barrier to exercise is rarely knowledge.

It's activation.

People often know exactly what they should do.

They just don't feel like doing it.

momentum helps by showing evidence from your own history.

Not generic motivation.

Not quotes.

Not streaks.

Just your own experience.

---

# Product Principles

## Record facts

Store what happened.

Examples

* Workout
* Exercise
* Set
* Body measurements
* Energy
* Notes

Do not store

* Streaks
* Achievements
* Trends
* Insights

Generate those later.

---

## No judgement

Never punish missed workouts.

Avoid

* Streak broken
* You missed yesterday

Prefer

* Welcome back
* Last workout 9 days ago

The app should always feel safe to return to.

---

## Reflection over performance

Numbers matter.

But reflections matter more.

Every workout should answer

How did you feel before?

How did you feel afterwards?

Was it worth it?

---

## Evidence over opinion

Every insight should come directly from your own history.

Never invent motivation.

---

# Design Philosophy

Calm.

Minimal.

Quiet.

Inspired by

* Apple Health
* Day One
* Headspace

Not

* Strong
* MyFitnessPal
* Duolingo

No flames.

No XP.

No badges.

No leaderboards.

No guilt.

---

# Colour Palette

Warm off-white background

White cards

Near-black typography

Muted forest green accent

Amber and purple only for highlights

Lots of whitespace.

Large typography.

Few distractions.

---

# Navigation

Home

Workouts

Progress

Insights

Simple.

---

# Home

Purpose

Answer two questions.

What should I do now?

Why is it worth doing?

Contains

Primary action

Log workout

Secondary action

Repeat previous workout

Then

Latest workout

Latest measurements

One insight

Nothing else.

---

# Workouts

A workout contains

Exercises

Sets

Reflections

Notes

History should be easy to browse.

Each workout becomes a journal entry.

---

# Progress

Tracks objective progress.

Examples

Weight

Max pull-ups

Bodyweight

Progress photos

Personal records

Graphs belong here.

Not on the Home screen.

---

# Insights

The most valuable screen.

Initially almost empty.

Gradually fills with observations.

Examples

You usually feel better after training.

Workouts under 20 minutes have your highest satisfaction.

You tend to exercise more consistently on Tuesdays.

Your pull-ups have increased from 1 to 4.

Everything shown should be supported by evidence.

---

# MVP

Only solve one problem.

Help someone consistently record workouts.

No planning.

No reminders.

No notifications.

No scheduling.

No AI.

Just

Log workouts

Record progress

Discover simple insights

---

# Workout Flow

Home

↓

Log workout

↓

Energy before

↓

Exercises

↓

Sets

↓

Energy after

↓

Worth it?

↓

Notes

↓

Save

Logging should take less than a minute.

---

# Data Model

## workout

Represents one completed workout.

Contains

* started_at
* completed_at
* status
* energy_before
* energy_after
* worth_it
* duration
* notes
* created_at
* updated_at

---

## exercise

Reference data.

Examples

Pull-up

Push-up

Squat

Dead hang

Run

Cycling

Contains

* key
* name

Only.

---

## workout_exercise

Represents one exercise within a workout.

Contains

* workout_id
* exercise_id
* sort_order
* notes

---

## workout_set

Represents one performed set.

Supports

* reps
* weight_kg
* duration_seconds
* distance_m
* reps_in_reserve
* round_number (circuit round; null for straight sets)
* notes

Not every field is used.

The schema should remain flexible.

Examples

Pull-up

reps

weight

Run

distance

duration

Dead hang

duration

---

## measurement_type

Examples

Weight

Max pull-ups

Waist

Body fat

Contains

* key
* name
* unit

---

## measurement

Contains

* measurement_type_id
* value
* recorded_at
* notes

---

# Reflections

The emotional side of the workout.

## Before

Energy

1–5

How are you feeling?

---

## After

Energy

1–5

How are you feeling now?

---

## Worth it?

1–5

The central question.

Not

Was it hard?

Instead

Knowing how you feel now...

Was it worth doing?

This becomes the heart of the product.

---

# Insight Engine

Insights are generated.

Never stored.

Each insight contains

* title
* summary
* confidence
* supporting evidence

Example

Title

You usually feel better after training.

Confidence

High

Evidence

18 of your last 22 workouts improved your energy.

The wording should always remain careful.

Use

Usually

Often

Seems

Appears

Never overstate conclusions.

---

# Future Features

Workout templates

Workout planning

Scheduling

Recurring workouts

Reminders

Exercise suggestions

Personal records

Automatic progression

Apple Health integration

Wearables

Import/export

Sharing

Tags

Search

Voice logging

Natural language workout entry

---

# Long-Term Vision

momentum should gradually evolve from

Workout logger

↓

Workout journal

↓

Personal coach

Not by becoming an AI.

Not by giving generic advice.

But by quietly reminding you of your own experience.

Examples

Last time you started this tired, you finished with more energy.

You've never regretted a workout shorter than 20 minutes.

Most of your favourite workouts happen on weekday evenings.

The app shouldn't tell you what works.

It should help you remember what has already worked for you.

---

# Success

The app succeeds if, on a day when you don't feel like exercising, it can show one small piece of evidence from your own history that makes starting feel just a little easier.

Everything else is secondary.
