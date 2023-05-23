require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const WebSocket = require("ws");

// Initialize a Slack Web API client
const web = new WebClient(process.env.SLACK_BOT_TOKEN);
let ws;

function connect() {
  // Connect to a WebSocket server
  ws = new WebSocket(process.env.WS_ADDR);

  ws.on("open", () => {
    console.log("Connected to WebSocket server");
    ws.send(
      JSON.stringify({
        method: "subscribe",
        params: { query: "tm.event='Tx'" },
        id: 1,
        jsonrpc: "2.0",
      })
    );
  });

  ws.on("message", async (message) => {
    // Parse the incoming message
    let data;
    try {
      data = JSON.parse(message).result.data;
    } catch (e) {
      console.error("Invalid JSON:", e);
      return;
    }

    if (!data || !data.value) {
      console.log("Ignoring message without value");
      return;
    }

    // Get the events from the transaction result
    const events = data.value.TxResult.result.events;

    // Iterate over the events
    for (let event of events) {
      // Decode the event type
      let eventType = Buffer.from(event.type).toString();

      // If the event type matches what we're interested in...
      if (eventType === "message") {
        let channel = "#gitopia-activity";
        let eventAttributes = {};

        // Iterate over the attributes of the event
        for (let attribute of event.attributes) {
          // Decode the attribute key and value
          let key = Buffer.from(attribute.key, "base64").toString();
          let value = Buffer.from(attribute.value, "base64").toString();

          eventAttributes[key] = value;
        }

        let blocks = []; // message blocks to be sent to Slack

        // Change the message format and displayed attributes based on the action value
        switch (eventAttributes["action"]) {
          case "MultiSetRepositoryBranch": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Branches updated by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>`,
              },
            });

            let branches;
            try {
              branches = JSON.parse(eventAttributes["RepositoryBranch"]);
            } catch (e) {
              console.error("Invalid JSON:", e);
              return;
            }

            let branchSection = {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: "*Name*",
                },
                {
                  type: "mrkdwn",
                  text: "*Sha*",
                },
              ],
            };

            for (let branch of branches) {
              branchSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}/tree/${branch.name}|${branch.name}>`,
                },
                {
                  type: "mrkdwn",
                  text: `${branch.sha}`,
                }
              );
            }

            blocks.push(branchSection);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiDeleteRepositoryBranch": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Branches deleted by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>`,
              },
            });

            let branches;
            try {
              branches = JSON.parse(eventAttributes["RepositoryBranch"]);
            } catch (e) {
              console.error("Invalid JSON:", e);
              return;
            }

            let branchSection = {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: "*Name*",
                },
                {
                  type: "mrkdwn",
                  text: "*Sha*",
                },
              ],
            };

            for (let branch of branches) {
              branchSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `${branch.name}`,
                },
                {
                  type: "mrkdwn",
                  text: `${branch.sha}`,
                }
              );
            }

            blocks.push(branchSection);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiSetRepositoryTag": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Tags updated by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>`,
              },
            });

            let tags;
            try {
              tags = JSON.parse(eventAttributes["RepositoryTag"]);
            } catch (e) {
              console.error("Invalid JSON:", e);
              return;
            }

            let tagSection = {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: "*Name*",
                },
                {
                  type: "mrkdwn",
                  text: "*Sha*",
                },
              ],
            };

            for (let tag of tags) {
              tagSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}/tree/${tag.name}|${tag.name}>`,
                },
                {
                  type: "mrkdwn",
                  text: `${tag.sha}`,
                }
              );
            }

            blocks.push(tagSection);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiDeleteRepositoryTag": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Tags deleted by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>`,
              },
            });

            let tags;
            try {
              tags = JSON.parse(eventAttributes["RepositoryTag"]);
            } catch (e) {
              console.error("Invalid JSON:", e);
              return;
            }

            let tagSection = {
              type: "section",
              fields: [
                {
                  type: "mrkdwn",
                  text: "*Name*",
                },
                {
                  type: "mrkdwn",
                  text: "*Sha*",
                },
              ],
            };

            for (let tag of tags) {
              tagSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `${tag.name}`,
                },
                {
                  type: "mrkdwn",
                  text: `${tag.sha}`,
                }
              );
            }

            blocks.push(tagSection);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "CreateUser": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `New user created <https://gitopia.com/${eventAttributes["UserUsername"]}|${eventAttributes["UserUsername"]}>`,
              },
            });
            break;
          }
          case "CreateDao": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `New dao created <https://gitopia.com/${eventAttributes["DaoName"]}|${eventAttributes["DaoName"]}>`,
              },
            });
            break;
          }
          case "CreateRepository": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `New repository created by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>\n<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryName"]}>`,
              },
            });
            break;
          }
          case "CreateIssue": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `New issue created by ${eventAttributes["Creator"]}\n<https://gitopia.com/${eventAttributes["RepositoryOwnerId"]}/issues/${eventAttributes["IssueIid"]}|#${eventAttributes["IssueIid"]} ${eventAttributes["IssueTitle"]}>`,
              },
            });
            break;
          }
          default:
            console.log(`Unsupported action ${eventAttributes["action"]}`);
            break;
        }

        // If the key and value match our criteria, set the flag to true
        if (
          eventAttributes["RepositoryOwnerId"] ===
          "gitopia1tkvqw2mwjsjptlm08jdp04mw2834qzd7v5x9nm5us8dp04hsp4rq3c8dm9"
        ) {
          channel = "#engineering";
        }

        // Send the message to Slack
        if (blocks.length > 0) {
          try {
            await web.chat.postMessage({
              channel,
              blocks: blocks,
            });
          } catch (e) {
            console.error("Error sending message to Slack:", e);
          }
        }
      }
    }
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error: ${error}`);
    ws.close();
  });

  ws.on("close", (code, reason) => {
    console.log(
      `WebSocket connection closed. Code: ${code}, Reason: ${reason}`
    );
    setTimeout(connect, 1000);
  });
}

connect();
