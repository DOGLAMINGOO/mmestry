# Project Context

This is an internal production & inventory management system
for a gear manufacturing business.

## Companies
- Company A: Converts raw rods → blanks → finished parts
- Company B: Converts blanks → finished parts
- Inventory is SEPARATE per company
- Clients are SHARED between companies
- Parts/gears are SHARED between companies
- Employees & machines are SHARED
- Processes are identical except Company B has one less stage

## Core Modules
1. Inventory Management (company-wise)
2. Purchase Orders (company selectable)
3. Production Management (company-wise)
4. Fixed Master Data (clients, parts, machines, employees)

## Rules
- All modules must stay connected
- Any update must reflect everywhere automatically
- Deadlines, PO dates, and status must stay in sync
- Tablet-first UI (web app)

## Tech
- Backend: Django
- DB: PostgreSQL
- Frontend: Web (tablet-friendly)

#Usernames and Passwords of the users
#admin admin01
#Manager1 mmestryman01
#Manager2 mmestryman02
#Stock-Manager mmestrysm01