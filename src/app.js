const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const aws = require("aws-sdk");
const uniqid = require("uniqid");
const { exec } = require("child_process");
const { formatDate } = require("./helper");
const { CORE } = require("./constants");

const s3 = new aws.S3({
  accessKeyId: CORE.S3_ACCESS_KEY,
  secretAccessKey: CORE.S3_SECRET_KEY,
});

// Bucket: 'example-bucket', replace example bucket with your s3 bucket name
// Key: 'data/data.json' replace file location with your s3 file location
const getFileFromS3 = (s3, params) => {
  return new Promise((resolve, reject) => {
    s3.getObject(params, function (err, data) {
      console.log(err);
      if (err) {
        reject(err);
      } else {
        resolve(data.Body.toString());
      }
    });
  });
};

const buildTestFile = (sourceCode, testCase, language) => {
  const filename = `${uniqid()}-${formatDate(new Date())}.test.js`;

  return new Promise((resolve, reject) => {
    console.log(path.join(__dirname, "..", "docker", language, "test", filename))
    fs.writeFile(
      path.join(__dirname, "..", "docker", language, "test", filename),
      sourceCode + "\n",
      "utf8",
      (err) => {
        if (err) reject(err);

        fs.appendFile(
          path.join(__dirname, "..", "docker", language, "test", filename),
          testCase,
          (err) => {
            if (err) reject(err);

            resolve(filename);
          }
        );
      }
    );
  });
};

const runCode = (filename, language) => {
  console.log("TCL: filename", filename);

  return new Promise((resolve, reject) => {
    exec(
      `docker run --rm -e FILENAME=${filename} -e TESTNAME=${filename} --mount type=bind,source=$(pwd)/docker/${language}/test,target=/var/app/test test-${language}`,
      { timeout: 10000 },
      (err, stdout, stderr) => {
        console.log("err", err)
        if (err !== null && stdout === "") {
          const output = stderr !== "" ? stderr : "Your code timed out.";
          reject(output);
        }
        console.log("stdout", stdout)
        resolve(stdout);
      }
    );
  });
};

const readReport = (filename, language) => {
  return new Promise((resolve, reject) => {
    const arr = filename.split(".");
    arr[arr.length - 1] = "json";
    const finalFilename = arr.join(".");
    fs.readFile(
      path.join(__dirname, "..", "docker", language, "test", finalFilename),
      (err, data) => {
        if (err) reject(err);

        if(!data) return resolve(null);

        resolve(data.toString());
      }
    );
  });
};

const app = express();
app.use(express.json());
app.use(cors());

app.post("/javascript-code/excute", async (req, res, next) => {
  try {
    const { sourceName, testCaseName, language } = req.body;

    console.log({ sourceName, testCaseName, language }, "{ sourceName, testCaseName, language }")
  
    const sourceCode = await getFileFromS3(s3, {
      Bucket: "codingame",
      Key: sourceName,
    });
  
    const testCase = await getFileFromS3(s3, {
      Bucket: "codingame",
      Key: testCaseName,
    });
  
    const filename = await buildTestFile(sourceCode, testCase, language);
    console.log("filename", filename)
    await runCode(filename, language);
  
    console.log("runCode", filename)
    const result = await readReport(filename, language);
  
    res.jsonp({
      success: true,
      message: "Excute successfully",
      data: result,
    });
  } catch(err) {
    console.log("err", err)
    res.status(400).jsonp({
      success: false,
      message: "Excute failed",
      data: err,
    })
  }
  
});

app.get("/ping", (req, res, next) => {
  res.status(200).jsonp({
    success: true,
    results: [],
    message: `I'm codingame-javascript-runner`,
  });
});

module.exports = app;
