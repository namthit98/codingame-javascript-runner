const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const aws = require("aws-sdk");
const uniqid = require("uniqid");
const { exec } = require("child_process");
const { formatDate } = require("./helper");

const s3 = new aws.S3({
  accessKeyId: "AKIAVF6JF4IEEA4653NX",
  secretAccessKey: "XGbL4IF4oxiPwgqImThPEu25itt980bChQ1YoEnX"
});

// Bucket: 'example-bucket', replace example bucket with your s3 bucket name
// Key: 'data/data.json' replace file location with your s3 file location
const getFileFromS3 = (s3, params) => {
  return new Promise((resolve, reject) => {
    s3.getObject(params, function(err, data) {
      console.log(err);
      if (err) {
        reject(err);
      } else {
        resolve(data.Body.toString());
      }
    });
  });
};

const buildTestFile = (sourceCode, testCase) => {
  const filename = `${uniqid()}-${formatDate(new Date())}.test.js`;

  return new Promise((resolve, reject) => {
    fs.writeFile(
      path.join(__dirname, "..", "docker/javascript/test", filename),
      sourceCode + "\n",
      "utf8",
      err => {
        if (err) reject(err);

        fs.appendFile(
          path.join(__dirname, "..", "test", filename),
          testCase,
          err => {
            if (err) reject(err);

            resolve(filename);
          }
        );
      }
    );
  });
};

const runCode = filename => {
console.log("TCL: filename", filename)
  return new Promise((resolve, reject) => {
    exec(
      `mocha test/${filename} --reporter mochawesome --reporter-options reportFilename=${filename},html=false`,
      { timeout: 10000 },
      (err, stdout, stderr) => {
        if (err !== null && stdout === "") {
          const output = stderr !== "" ? stderr : "Your code timed out.";
          reject(output);
        }
        resolve(stdout);
      }
    );
  });
};

const readReport = filename => {
  return new Promise((resolve, reject) => {
    const arr = filename.split(".");
    arr[arr.length - 1] = "json";
    const finalFilename = arr.join(".");
    fs.readFile(
      path.join(__dirname, "..", "mochawesome-report", finalFilename),
      (err, data) => {
        if (err) reject(err);

        resolve(data.toString());
      }
    );
  });
};

const app = express();
app.use(express.json());
app.use(cors());

app.post("/javascript-code/excute", async (req, res, next) => {
  const { sourceName, testCaseName } = req.body;

  const sourceCode = await getFileFromS3(s3, {
    Bucket: "codingame",
    Key: sourceName
  });

  const testCase = await getFileFromS3(s3, {
    Bucket: "codingame",
    Key: testCaseName
  });

  const filename = await buildTestFile(sourceCode, testCase);
  await runCode(filename);
  const result = await readReport(filename);

  res.jsonp({
    success: true,
    message: "Excute successfully",
    data: result
  });
});

app.get("/ping", (req, res, next) => {
  res.status(200).jsonp({
    success: true,
    results: [],
    message: `I'm codingame-javascript-runner`
  });
});

module.exports = app;
