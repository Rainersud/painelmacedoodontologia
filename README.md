# Macedo Odontologia

Project Context:
Develop a Dental CRM integrated with a Call Center, focused on lead acquisition, customer service, and conversion via WhatsApp and phone calls, with agent performance management, real goal tracking, and a management dashboard, designed for mid-sized dental clinics (monthly revenue between R$20,000 and R$300,000).

1️⃣ System Objective

Build a commercial Dental CRM that:

Centralizes leads from WhatsApp and phone calls

Organizes the clinic’s commercial sales funnel

Monitors call center agent performance

Tracks operational, commercial, and financial KPIs

Connects service → appointment → attendance → revenue

2️⃣ User Roles
👤 Administrator / Manager

Configures goals and KPIs

Views global and individual dashboards

Monitors revenue, ROI, and productivity

Manages users and permissions

👩‍💼 Agent / Call Center

Views assigned leads and interactions

Tracks daily, weekly, and monthly goals

Views team rankings

Receives alerts and automated reminders

3️⃣ CRM Structure (Modules)
📥 Lead Management

Automatic lead intake via:

WhatsApp Business API

Phone calls

Automatic lead registration including:

Name

Phone number

Lead source

Date/time of entry

Automatic or manual lead assignment to agents

Complete interaction history logging

🔄 Dental Sales Funnel

Configurable statuses:

New lead

In service

Appointment scheduled

Confirmed

Attended

No-show

Not converted

Each status change directly impacts KPIs.

4️⃣ Management Dashboard (Layout)
📊 Overview

Top KPI cards:

Leads received

Leads handled

Appointments scheduled

Conversion rate (%)

Revenue generated

Charts:

Leads vs. appointments over time

Monthly conversion rate

Attendance rate (%)

Lead source vs. conversion

👥 Call Center Dashboard (Per Agent)

Individual indicators:

Leads handled

Calls made

Appointments scheduled

Conversion rate (%)

Attendance rate (%)

Average response time

Revenue generated

Goals:

Progress bars (daily / weekly / monthly)

Performance traffic light (green / yellow / red)

Rankings:

Appointments ranking

Revenue ranking

5️⃣ KPIs Implemented (Mandatory)
Service

Leads received

Leads handled

Response rate (%)

Average first response time

Unanswered leads

Call Center

Calls made

Calls answered

Contact rate (%)

Average handling time

Conversion

Appointments scheduled

Conversion rate (%)

Appointments per agent

Attendance

Attendance rate (%)

No-shows and cancellations

Financial

Revenue per lead

Revenue per agent

Average ticket value

Marketing ROI

6️⃣ Goals per Agent

Configurable goals by period:

Daily

Weekly

Monthly

Goal types:

Leads handled

Appointments scheduled

Conversion rate (%)

Attendance rate (%)

Revenue

Visualization:

Progress bars

Color status indicators (green, yellow, red)

7️⃣ Business Rules

Every lead must have:

Source

Assigned agent

Funnel status

Confirmed appointments impact conversion KPIs

Attended appointments impact revenue

Leads not answered within SLA trigger automatic alerts

Calls and messages are logged for auditing

8️⃣ Integrations

WhatsApp Business API

Telephony / Call Center system (dialer or call logging)

Dental scheduling system

Automated appointment confirmations

(Optional) Financial module

9️⃣ Reports

Agent performance reports

Goals vs. actual results

Conversion by lead source

Monthly financial reports

Export to PDF and Excel

🔟 Alerts and Automation

Unanswered lead alerts

Daily goal not achieved alerts

Automated follow-up reminders

Manager notifications when KPIs drop

1️⃣1️⃣ UX/UI Guidelines

Clean, professional interface

Clear and visual dashboards

Designed for fast decision-making

Fully responsive (desktop and mobile)

Optimized for call center workflows

🎯 Expected Outcome

A robust Dental CRM + Call Center solution that:

Organizes and accelerates lead handling

Increases conversion and attendance rates

Provides full visibility for managers

Connects operations, goals, and revenue

Scales clinic performance efficiently

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://smile-conversion-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3068e588-4fea-41a3-86bc-7db5d3dcc76b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
