FROM node:alpine

WORKDIR /var/app

RUN npm i -g mocha mochawesome

RUN npm i chai

EXPOSE 80

ARG FILENAME
ENV FILENAME=${FILENAME}

ARG TESTNAME
ENV TESTNAME=${TESTNAME}


CMD ["sh", "-c", "mocha ./test/${FILENAME} --reporter mochawesome --reporter-options reportDir=test,reportFilename=${TESTNAME},html=false"]

# docker build -t test-javascript . 
# docker run -v $(pwd)/test:/var/app/test test-javascript 
# mocha "./test/main.js" --reporter mochawesome --reporter-options reportDir=test,reportFilename=test,html=false   