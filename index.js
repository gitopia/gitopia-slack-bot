require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const WebSocket = require("ws");
const axios = require("axios");
const express = require("express");
const bodyParser = require("body-parser");
const { GITOPIA_API_URL } = require("./config");
const { getUsername, resolveAddress, getRepoDetails } = require("./util");

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
            let username = "";
            try {
              username = await getUsername(eventAttributes["Creator"]);
            } catch (error) {
              username = eventAttributes["Creator"];
            }

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

            const repoOwnerName = await resolveAddress(
              eventAttributes["RepositoryOwnerId"],
              eventAttributes["RepositoryOwnerType"]
            );

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

            const repoOwnerName = await resolveAddress(
              eventAttributes["RepositoryOwnerId"],
              eventAttributes["RepositoryOwnerType"]
            );

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

            const repoOwnerName = await resolveAddress(
              eventAttributes["RepositoryOwnerId"],
              eventAttributes["RepositoryOwnerType"]
            );

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

            const repoOwnerName = await resolveAddress(
              eventAttributes["RepositoryOwnerId"],
              eventAttributes["RepositoryOwnerType"]
            );

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
            const username = await getUsername(eventAttributes["Creator"]);

            const repoOwnerName = await resolveAddress(
              eventAttributes["RepositoryOwnerId"],
              eventAttributes["RepositoryOwnerType"]
            );

            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: `New repository created by <https://gitopia.com/${username}|${username}>\n<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}|${eventAttributes["RepositoryName"]}>`,
              },
            });
            break;
          }
          case "CreateIssue": {
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

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
          case "AddIssueAssignees": {
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

              let assignees = "";
              for (let assignee of JSON.parse(eventAttributes["Assignees"])) {
                const assigneeUsername = await getUsername(assignee);
                assignees += `<https://gitopia.com/${assigneeUsername}|${assigneeUsername}>, `;
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${username}|${username}> assigned the issue to ${assignees}\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/issues/${eventAttributes["IssueIid"]}|${repoOwnerName}/${repositoryName} #${eventAttributes["IssueIid"]}>`,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "ToggleIssueState": {
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

              let message = "";
              switch (eventAttributes["IssueState"]) {
                case "OPEN":
                  message = `<https://gitopia.com/${username}|${username}> re-opened the issue\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/issues/${eventAttributes["IssueIid"]}|${repoOwnerName}/${repositoryName} #${eventAttributes["IssueIid"]}>`;
                  break;
                case "CLOSED":
                  message = `<https://gitopia.com/${username}|${username}> closed the issue\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/issues/${eventAttributes["IssueIid"]}|${repoOwnerName}/${repositoryName} #${eventAttributes["IssueIid"]}>`;
                  break;
                default:
                  message = "Unhandled state";
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: message,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "CreatePullRequest": {
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

              if (subscriptions.includes(repoOwnerName)) {
                channel = "#engineering";
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
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

              if (subscriptions.includes(repoOwnerName)) {
                channel = "#engineering";
              }

              let message = "";
              switch (eventAttributes["PullRequestState"]) {
                case "MERGED": {
                  const headRepo = JSON.parse(
                    eventAttributes["PullRequestHead"]
                  );

                  const { headRepoOwnerName, headRepositoryName } =
                    getRepoDetails(headRepo.repositoryId);
                  const baseRepoBranch = JSON.parse(
                    eventAttributes["RepositoryBranch"]
                  );

                  message = `<https://gitopia.com/${username}|${username}>  merged <https://gitopia.com/${headRepoOwnerName}/${headRepositoryName}/tree/${headRepo.branch}|${headRepoOwnerName}:${headRepositoryName}/${headRepo.branch}> to <https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}/tree/${baseRepoBranch.name}|${baseRepoBranch.name}>\n<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}/pulls/${eventAttributes["PullRequestIid"]}|${repoOwnerName}/${eventAttributes["RepositoryName"]} #${eventAttributes["PullRequestIid"]}>`;
                  break;
                }
                case "CLOSED":
                  message = `PR closed by <https://gitopia.com/${username}|${username}>\n<https://gitopia.com/${repoOwnerName}/${eventAttributes["RepositoryName"]}/pulls/${eventAttributes["PullRequestIid"]}|PR #${eventAttributes["PullRequestIid"]}>`;
                  break;
                default:
                  message = "Unhandled state";
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: message,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "LinkPullRequestIssueByIid": {
            try {
              const { repoOwnerName, repositoryName } = getRepoDetails(
                eventAttributes["RepositoryId"]
              );
              const username = await getUsername(eventAttributes["Creator"]);

              if (subscriptions.includes(repoOwnerName)) {
                channel = "#engineering";
              }

              blocks.push({
                type: "section",
                text: {
                  type: "mrkdwn",
                  text: `<https://gitopia.com/${username}|${username}> linked the PR to <https://gitopia.com/${repoOwnerName}/${repositoryName}/issues/${eventAttributes["IssueIid"]}|#${eventAttributes["IssueIid"]}>\n<https://gitopia.com/${repoOwnerName}/${repositoryName}/pulls/${eventAttributes["PullRequestIid"]}|${repoOwnerName}/${repositoryName} #${eventAttributes["PullRequestIid"]}>`,
                },
              });
            } catch (error) {
              console.error(`Error getting repository details: ${error}`);
            }
            break;
          }
          case "/gitopia.gitopia.gitopia.MsgCreateComment": {
            blocks.push({
              type: "section",
              text: {
                type: "mrkdwn",
                text: "New comment somewhere :man-shrugging:",
              },
            });

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

        const keysToCheck = ["RepositoryOwnerId", "RepositoryOwnerType"];
        const keysExist = keysToCheck.every((key) =>
          eventAttributes.hasOwnProperty(key)
        );

        if (keysExist) {
          const repoOwnerName = await resolveAddress(
            eventAttributes["RepositoryOwnerId"],
            eventAttributes["RepositoryOwnerType"]
          );

          if (subscriptions.includes(repoOwnerName)) {
            channel = "#engineering";
          }
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

let subscriptions = [];

connect();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(3000, () => {
  console.log(
    "Express server listening on port %d in %s mode",
    server.address().port,
    app.settings.env
  );
});

app.post("/", (req, res) => {
  let message = "";
  let text = req.body.text;
  const args = text.split(" ");

  if (args.length !== 2) {
    message = "Invalid command";
  }

  switch (args[0]) {
    case "subscribe": {
      if (args[1] === "list") {
        message = `Active subscriptions: ${subscriptions}`;
      } else {
        const index = subscriptions.indexOf(args[1]);
        if (index !== -1) {
          message = `Already subscribed to ${args[1]}`;
        } else {
          subscriptions.push(args[1]);
          message = `Subscribed to ${args[1]}`;
        }
      }
      break;
    }
    case "unsubscribe": {
      const index = subscriptions.indexOf(args[1]);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        message = `Unsubscribed to ${args[1]}`;
      } else {
        message = `Not subscribing to ${args[1]} already`;
      }
      break;
    }
    default:
      message = "Invalid command";
  }

  let data = {
    response_type: "in_channel", // public to the channel
    text: message,
  };

  res.json(data);
});
