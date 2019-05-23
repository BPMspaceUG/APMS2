# APMS
**APMS** means **A**gile **P**rocess **M**anagement **S**ystem
![APMS Logo](http://www.bpmspace.com/assets/img/BPMspace_APMS.png)

# Requirements

## Database Structure
- Tables must have only ONE Primary Column (no split primarykeys allowed)
- Tablename must contain only this Letters: "A-Z", "a-z" and "_"
- The columnname "state_id" is reserved and can NOT be used

- The structure must be structured via *objects* or *relations*
  - **Objects** are tables with at least ONE attribute (for example: name, duration, size, time, etc.)
  - **Relations** are basically n:m tables with only foreign keys

## Getting started

1. Clone the Git-repository

2. Compile TS-Files automatically: The javascript is generated via Typescript. So go into the project folder and start
```javascript
tsc -w
```
3. Ready to go -> Now you can edit all files
