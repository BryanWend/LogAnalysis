# LogAnalysis
Find out how your organization is utilizing their hardware manageability solution.
#### Note: All data has been scrubbed and has been replaced with fictitious examples.

These solutions compile and parse log data from 1000's of machines using a specific manageability hardware solution.  Pulling the logs from your devices assumes access to an open-source commandline tool, MeshCMD (until a new solution is released), and a software distribution platform such as SCCM to push the executable and return the output.  Or else hostname, FW username, and FW pass must be known for each unique machine. 

Example MeshCMD command:

`meshcmd amtauditlog --uuidoutput //--json optional depending on use case`

There are three differing concepts detailed below:
- Multi Device Version
- Single Device Version
- Excel Version

All versions have sample JSON/CSV data files as well as sample premade outputs.

# Multi Device Version

The Multi Device Version is the most extensive and versatile version. This version compiles and stores all data within a MongoDB NoSQL database and has the possibility to perform more intensive queries.  Current examples include average KVM session time, unauthorized access, and more.

Node.js npm Dependencies:
- JSDOM - HTML DOM emulation
- D3.js - Charts/Graphs/Analytics Visualizations
- Mongoose - MongoDB schemas and optimizations

### How to Use

Install and start a local MongoDB server. 
[For full instructions, click here](http://mongodb.github.io/node-mongodb-native/3.1/quick-start/quick-start/)

Navigate to the root directory and Run the node 'app.js' file and pass it a folderpath with the logs

```
Example: node app.js C:\Users\Bryan\Documents\MultiDeviceVersion\AuditLogs\
Example: node app.js .\AuditLogs\
```

On execution, it will create and/or connect to the database, perform cleaning operations on the dataset, create any new required documents, and then generate an output SVG file with basic example analytics.

# Single Device Version

The Single Device Version returns the usage of a single machine selected from a drop-down menu.  Multiple files can be highlighted to be included into the drop-down, however basic analytics will only be given on one at a time.

### How to Use

Open the index.html file in a browser of your choice (Chrome or Firefox Recommended)

Click Choose Files and select any number of JSON files from a folder.

Click the Generate button.

# Excel Version

This version is the most simplistic while still offering a varying amount of entry data analysis.  However, Excel is limited to just over 1m rows of data. In situations where the data might exceed 600k+ records, the multi device solution will provide a much quicker and deeper solution.

### How to Use
Enter a file path that contains the .csv files into Cell B1 of the template example file.

`Example: C:\Users\Bryan\Documents\`

Then, run the macro.

Navigating to and refreshing the 'Pivot' worksheet will supply you with a set of datapoints for initial feedback.
