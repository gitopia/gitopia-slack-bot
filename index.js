require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const WebSocket = require("ws");
const axios = require("axios");
const { GITOPIA_API_URL } = require("./config");
const { getUsername, getDAOname } = require("./util");

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
            const username = await getUsername(eventAttributes["Creator"]);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Branches updated by <https://gitopia.com/${username}|${username}>`,
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

            var repoOwnerName = "";
            if (eventAttributes["RepositoryOwnerType"] === "USER") {
              repoOwnerName = await getUsername(
                eventAttributes["RepositoryOwnerId"]
              );
            } else {
              repoOwnerName = await getDAOname(
                eventAttributes["RepositoryOwnerId"]
              );
            }

            for (let branch of branches) {
              branchSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}/tree/${branch.name}|${branch.name}>`,
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
                text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}|${repoOwnerName}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiDeleteRepositoryBranch": {
            const username = await getUsername(eventAttributes["Creator"]);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Branches deleted by <https://gitopia.com/${username}|${username}>`,
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

            var repoOwnerName = "";
            if (eventAttributes["RepositoryOwnerType"] === "USER") {
              repoOwnerName = await getUsername(
                eventAttributes["RepositoryOwnerId"]
              );
            } else {
              repoOwnerName = await getDAOname(
                eventAttributes["RepositoryOwnerId"]
              );
            }

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}|${repoOwnerName}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiSetRepositoryTag": {
            const username = await getUsername(eventAttributes["Creator"]);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Tags updated by <https://gitopia.com/${username}|${username}>`,
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

            var repoOwnerName = "";
            if (eventAttributes["RepositoryOwnerType"] === "USER") {
              repoOwnerName = await getUsername(
                eventAttributes["RepositoryOwnerId"]
              );
            } else {
              repoOwnerName = await getDAOname(
                eventAttributes["RepositoryOwnerId"]
              );
            }

            for (let tag of tags) {
              tagSection.fields.push(
                {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}/tree/${tag.name}|${tag.name}>`,
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
                text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}|${repoOwnerName}/${eventAttributes["RepositoryName"]}>`,
              },
            });

            break;
          }
          case "MultiDeleteRepositoryTag": {
            const username = await getUsername(eventAttributes["Creator"]);

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Tags deleted by <https://gitopia.com/${username}|${username}>`,
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

            var repoOwnerName = "";
            if (eventAttributes["RepositoryOwnerType"] === "USER") {
              repoOwnerName = await getUsername(
                eventAttributes["RepositoryOwnerId"]
              );
            } else {
              repoOwnerName = await getDAOname(
                eventAttributes["RepositoryOwnerId"]
              );
            }

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}|${repoOwnerName}/${eventAttributes["RepositoryName"]}>`,
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
            var repoOwnerName = "";
            if (eventAttributes["RepositoryOwnerType"] === "USER") {
              repoOwnerName = await getUsername(
                eventAttributes["RepositoryOwnerId"]
              );
            } else {
              repoOwnerName = await getDAOname(
                eventAttributes["RepositoryOwnerId"]
              );
            }

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
            try {
              const response = await axios.get(
                `${GITOPIA_API_URL}/repository/${eventAttributes["RepositoryId"]}`
              );
              const repositoryName = response.data.Repository.name;

              const username = await getUsername(eventAttributes["Creator"]);

              var repoOwnerName = "";
              if (eventAttributes["RepositoryOwnerType"] === "USER") {
                repoOwnerName = await getUsername(
                  eventAttributes["RepositoryOwnerId"]
                );
              } else {
                repoOwnerName = await getDAOname(
                  eventAttributes["RepositoryOwnerId"]
                );
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `New issue created by <https://gitopia.com/${username}|${username}>\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/issues/${eventAttributes["IssueIid"]}|#${eventAttributes["IssueIid"]} ${eventAttributes["IssueTitle"]}>`,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "CreatePullRequest": {
            try {
              const response = await axios.get(
                `${GITOPIA_API_URL}/repository/${eventAttributes["RepositoryId"]}`
              );
              const repositoryName = response.data.Repository.name;
              const repositoryOwnerId = response.data.Repository.owner.id;
              const repositoryOwnerType = response.data.Repository.owner.type;

              if (
                repositoryOwnerId ===
                "gitopia1tkvqw2mwjsjptlm08jdp04mw2834qzd7v5x9nm5us8dp04hsp4rq3c8dm9"
              ) {
                channel = "#engineering";
              }

              const username = await getUsername(eventAttributes["Creator"]);

              var repoOwnerName = "";
              if (repositoryOwnerType === "USER") {
                repoOwnerName = await getUsername(repositoryOwnerId);
              } else {
                repoOwnerName = await getDAOname(repositoryOwnerId);
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `New PR created by <https://gitopia.com/${username}|${username}>\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/pulls/${eventAttributes["PullRequestIid"]}|#${eventAttributes["PullRequestIid"]} ${eventAttributes["PullRequestTitle"]}>`,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "SetPullRequestState": {
            // TODO
            break;
          }
          case "/gitopia.gitopia.gitopia.MsgCreateComment": {
            try {
              const response = await axios.get(
                `${GITOPIA_API_URL}/repository/${eventAttributes["RepositoryId"]}`
              );
              const repositoryName = response.data.name;
              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `New comment in  by <https://gitopia.com/${eventAttributes["Creator"]}|${eventAttributes["Creator"]}>`,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "ForkRepository": {
            // TODO
            break;
          }
          default:
            console.log(`Unsupported action ${eventAttributes["action"]}`);
            break;
        }

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
