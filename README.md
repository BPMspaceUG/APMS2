# APMS2

**APMS2** stands for **A**gile **P**rocess **M**anagement **S**ystem Version **2**
![APMS Logo](http://www.bpmspace.com/assets/img/BPMspace_APMS.png)

# Setup a new project
## Requirements
* valid https://github.com Account
* valid https://cloud.docker.com Account
* docker and docker-compose installed on a machine
* Project Name
## Preperation 
* create git Repo from template with URL https://github.com/[Account]/[ProjectName]
<br> Template Repo is https://github.com/BPMspaceUG/APMS2_project_template.git
<br><hr> 
  > INFO 
  > * https://help.github.com/en/github/creating-cloning-and-archiving-repositories/creating-a-repository-from-a-template
  > * https://developer.github.com/v4/mutation/clonetemplaterepository/
  > * https://stackoverflow.com/questions/56577184/github-pull-changes-from-a-template-repository
  <hr><br>
* create branch "dev", "test", "stage" beside the "master" branch
  <br><hr> 
  > INFO 
  > * https://gist.github.com/jedmao/5053440
  > * https://medium.com/@patrickporto/4-branching-workflows-for-git-30d0aaee7bf
  <hr><br>
* create docker Repo with URL https://cloud.docker.com/repository/docker/[Account]/[ProjectName]
* setup automatic build with "Enable for Base Image" ON<br>
  * SourceType  | Source  | DockerTag           | DockerfileLocation<br>
  * branch      | master  | ProjectName.master  | Dockerfile.master<br>
  * branch      | stage   | ProjectName.stage   | Dockerfile.stage<br>
  * branch      | test    | ProjectName.test    | Dockerfile.test<br>
  * branch      | dev     | ProjectName.master  | Dockerfile.dev<br>
  <br>
# Design Database
# Database Design Principles
- Tables must have only ONE Primary Column (no split primarykeys allowed)
- Tablename must contain only this Letters: "A-Z", "a-z" and "_"
- The columnname "state_id" is reserved and can NOT be used

- The structure must be structured via *objects* or *relations*
  - **Objects** are tables with at least ONE attribute (for example: name, duration, size, time, etc.)
  - **Relations** are basically n:m tables with only foreign keys. Always use n:m tables! The decediation whether it is a 1:n or n:1 link is made in APMS2

## Getting started

1. Clone the Git-repository
2. Compile TS-Files automatically: The javascript is generated via Typescript. So go into the project folder and start
```javascript
tsc -w
```
3. Ready to go -> Now you can edit all files
