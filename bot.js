const { Client, ActivityType, GatewayIntentBits, Partials } = require("discord.js");
const { channelId, guildId, token } = require('./config.json');
const aiGenerated = require('./aiGenerated.json');
const aiLiveBank = require('./aiLiveBank.json');
const aiMainBank = require('./aiMainBank');
const urban = require('urban');
const fs = require('fs');

const client = new Client({
  presence: {
    afk: false,
    activities: [
      {
        name: "DM me for personalized assistance",
        type: ActivityType.PLAYING,
      },
      {
        name: "Analyzing direct messages",
        type: ActivityType.WATCHING,
      },
      {
        name: "Providing support via DMs",
        type: ActivityType.LISTENING,
      },
    ],
    status: 'online',
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once('ready', () => {
  console.log(`\x1b[32m|\x1b[37m AI Ready! Logged in as \x1b[32m(\x1b[37m${client.user.tag}\x1b[32m) \x1b[32m|`);
  console.log(`\x1b[32m-----------------------------------------\x1b[37m`);
  client.user.setUsername("CleverBot");
  const avatarData = fs.readFileSync('avatar.png');
  client.user.setAvatar(avatarData);
  const professionalMessages = [
    "Ready to provide personalized assistance via DMs.",
    "Analyzing and responding to direct messages.",
    "Improving your experience through one-on-one support.",
    "Available for direct messaging. Send me a DM!",
    "Exclusively offering assistance through direct messages.",
  ];
  function updateActivity() {
    const randomIndex = Math.floor(Math.random() * professionalMessages.length);
    const professionalMessage = professionalMessages[randomIndex];
    const activity = {
      name: professionalMessage,
      type: ActivityType.LISTENING,
    };
    client.user.setActivity(activity.name, { type: activity.type });
  }
  updateActivity();
  setInterval(updateActivity, 300000);
  client.user.setStatus("online");
});

const allQuestions = aiGenerated.questions.concat(aiLiveBank.questions);
const allAnswers = aiGenerated.answers.concat(aiLiveBank.answers);

function getCommonWords(sentences, threshold) {
  const wordCount = {};
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.toLowerCase().split(' ');
    for (let j = 0; j < words.length; j++) {
      const word = words[j].replace(/[^a-zA-Z0-9\s]/g, '');
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  }
  const commonWords = [];
  const uncommonWords = [];
  for (const word in wordCount) {
    if (wordCount[word] >= threshold) {
      commonWords.push(word);
    } else {
      uncommonWords.push(word);
    }
  }
  return {
    commonWords,
    uncommonWords
  };
}

const conversationData = {
  questions: [...allQuestions],
  answers: [...allAnswers],
  intents: []
};

const threshold = 25;

const { commonWords, uncommonWords } = getCommonWords(conversationData.questions, threshold);

conversationData.intents = uncommonWords;

let oneTime = true;

function fancyConsoleLog(title, data) {
  const length = data.length;
  const line = "-".repeat(title.length + length.toString().length);
  if (oneTime) {
	  console.log(`\x1b[32m${line}`);
	  oneTime = false;
  }
  console.log(`\x1b[32m| \x1b[37m${title}: \x1b[32m(\x1b[37m${length}\x1b[32m) |`);
  console.log(`\x1b[32m${line}\x1b[0m`);
}

const lineLength = aiLiveBank.questions.length.toString().length + 21;
const line = "-".repeat(lineLength);

fancyConsoleLog('\x1b[37mLive DB Questions Count #\x1b[0m', aiLiveBank.questions);
fancyConsoleLog('\x1b[37mLive DB Answers Count #\x1b[0m', aiLiveBank.answers);
fancyConsoleLog('\x1b[37mCommon Intents Count #\x1b[0m', commonWords);
fancyConsoleLog('\x1b[37mUncommon Intents Count #\x1b[0m', uncommonWords);
fancyConsoleLog('\x1b[37mDataBank Questions Count #\x1b[0m', conversationData.questions);
fancyConsoleLog('\x1b[37mDataBank Answers Count #\x1b[0m', conversationData.answers);
fancyConsoleLog('\x1b[37mDataBank Intents Count #\x1b[0m', conversationData.intents);

function tokenizeSentence(sentence) {
  if (!sentence) return;
  return sentence.toLowerCase().match(/\b\w+\b/g);
}

function recognizeNamedEntities(sentence) {
  const tokens = tokenizeSentence(sentence);
  const namedEntities = [];
  const entityRules = {
    'PERSON': aiMainBank.isPersonName,
    'LOCATION': aiMainBank.isLocationName
  };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    for (const entity in entityRules) {
      if (entityRules[entity](token)) {
        namedEntities.push({
          name: token,
          type: entity
        });
      }
    }
  }
  return namedEntities;
}

function generateRandomAnswer() {
  const randomIndex = Math.floor(Math.random() * conversationData.answers.length);
  return conversationData.answers[randomIndex];
}

function sanitizeInput(input) {
  const sanitizedInput = input.replace(/[^a-zA-Z0-9\s]/g, '');
  const trimmedInput = sanitizedInput.trim();
  return trimmedInput;
}

async function processMessage(message) {
  let content = message.content;
  content = sanitizeInput(content);
  if (!content) return;
  const timestamp = new Date().toLocaleString();
  const username = message.author.username;
  const usertag = message.author.tag;
  const discorduser = usertag;
  const userId = message.author.id;
  const userIntents = extractIntents(tokenizeSentence(content));
  const questionTokens = tokenizeSentence(content);
  const namedEntities = recognizeNamedEntities(content);
  const extractedIntents = extractIntents(questionTokens);
  let bestMatchIndex = -1;
  let bestMatchScore = 0;
  for (let i = 0; i < conversationData.questions.length; i++) {
    const question = conversationData.questions[i];
    const intentTokens = tokenizeSentence(question);
    const namedEntitiesInQuestion = recognizeNamedEntities(question);
    let score = 0;
    if (extractedIntents.includes(question)) {
      for (let j = 0; j < questionTokens.length; j++) {
        const token = questionTokens[j];
        if (intentTokens.includes(token)) {
          score++;
        }
      }
    } else {
      for (let j = 0; j < questionTokens.length; j++) {
        const token = questionTokens[j];
        if (intentTokens.includes(token)) {
          score++;
        }
      }
    }
    for (let j = 0; j < namedEntities.length; j++) {
      const namedEntity = namedEntities[j];
      const { name, type } = namedEntity;
      for (let k = 0; k < namedEntitiesInQuestion.length; k++) {
        const namedEntityInQuestion = namedEntitiesInQuestion[k];
        const { name: entityName, type: entityType } = namedEntityInQuestion;
        if (name.toLowerCase() === entityName.toLowerCase() && type === entityType) {
          score++;
        }
      }
    }
    if (score > bestMatchScore) {
      bestMatchIndex = i;
      bestMatchScore = score;
    }
  }
  if (bestMatchIndex === -1) {
    const answer = await handleMessage(message);
    const logEntry = {
      timestamp,
      discorduser,
      userId,
      content,
      answer,
      userIntents
    };
    logToAiLogs(logEntry);
  } else {
    const question = conversationData.questions[bestMatchIndex];
    const answer = conversationData.answers[bestMatchIndex];
    if (isMathematicalQuestion(message.content)) {
      const response = handleMathematicalQuestion(message.content);
	  const logEntry = {
        timestamp,
        discorduser,
        userId,
        content,
        response,
        userIntents
      };
      logToAiLogs(logEntry);
      message.channel.send(response);
    } else {
      const logEntry = {
        timestamp,
        discorduser,
        userId,
        content,
        answer,
        userIntents
      };
      logToAiLogs(logEntry);
      message.channel.send(answer);
    }
  }
}

function isMathematicalQuestion(question) {
  const mathRegex = /[\d+\-*/^()%]/;
  return mathRegex.test(question);
}

function sanitizeMathematicalInput(input) {
  const sanitizedInput = input.replace(/[^0-9+\-*/().]/g, '');
  return sanitizedInput;
}

function handleMathematicalQuestion(question) {
  const sanitizedQuestion = sanitizeMathematicalInput(question);
  try {
    const result = evaluateMathematicalExpression(sanitizedQuestion);
    const response = `Hmm, let me think... The answer is ${result}.`;
    return response;
  } catch (error) {
    console.error('Error evaluating the mathematical expression:', error);
    return 'Oops! It seems there was an error evaluating the mathematical equation. Try asking me another math question!';
  }
}

function evaluateMathematicalExpression(expression) {
  let currentResult = 0;
  let currentOperator = '+';
  let currentOperand = '';
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    if (char === '(') {
      let parenthesisCount = 1;
      let endIndex = i + 1;
      while (endIndex < expression.length && parenthesisCount > 0) {
        if (expression[endIndex] === '(') {
          parenthesisCount++;
        } else if (expression[endIndex] === ')') {
          parenthesisCount--;
        }
        endIndex++;
      }
      const subExpression = expression.substring(i + 1, endIndex - 1);
      const subExpressionResult = evaluateMathematicalExpression(subExpression);
      currentOperand += subExpressionResult;
      i = endIndex - 1;
      continue;
    }
    if ('+-*/'.includes(char)) {
      const operand = parseFloat(currentOperand);
      currentResult = evaluateOperator(currentOperator, currentResult, operand);
      currentOperator = char;
      currentOperand = '';
    } else {
      currentOperand += char;
    }
  }
  const lastOperand = parseFloat(currentOperand);
  currentResult = evaluateOperator(currentOperator, currentResult, lastOperand);
  return currentResult;
}

function isNumeric(value) {
  return !isNaN(value);
}

function evaluateOperator(operator, leftOperand, rightOperand) {
  switch (operator) {
    case '^':
      return Math.pow(leftOperand, rightOperand);
    case '*':
      return leftOperand * rightOperand;
    case '/':
      if (rightOperand === 0) {
        throw new Error('Division by zero');
      }
      return leftOperand / rightOperand;
    case '+':
      return leftOperand + rightOperand;
    case '-':
      return leftOperand - rightOperand;
    default:
      throw new Error('Invalid operator');
  }
}

function fetchUrbanResponse(searchTerm) {
  return new Promise((resolve, reject) => {
    urban(searchTerm).first((json) => {
      if (json) {
        resolve(json.definition);
      } else {
        reject(new Error('No results found.'));
      }
    });
  });
}


function extractIntents(tokens) {
  const intents = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i].toLowerCase();
    for (const [intent, keywords] of aiMainBank.keywordMap) {
      if (keywords.includes(token) && !intents.includes(intent)) {
        intents.push(intent);
      }
    }
  }
  return intents;
}

async function handleMessage(message) {
  try {
	const content = sanitizeInput(message.content);
    const urbanResponse = await fetchUrbanResponse(content);
    message.channel.send(urbanResponse);
	return urbanResponse;
  } catch (error) {
    message.channel.send('CleverBot: No response found at this time. Feel free to ask again in the future.');
	return 'CleverBot: No response found at this time. Feel free to ask again in the future.';
  }
}

client.on('messageCreate', (message) => {
  if (message.author.bot) return;
  if (message.channel.type === 1) {
    processMessage(message);
  }
});

function logToAiLogs(logEntry) {
	const aiLogsFilePath = 'aiLogs.json';
	fs.readFile(aiLogsFilePath, 'utf8', (err, data) => {
		let aiLogs = [];
		if (!err) {
			try {
				aiLogs = JSON.parse(data);
			} catch (parseError) {
				console.error('Error parsing aiLogs.json:', parseError);
			}
		}
		aiLogs.push(logEntry);
		fs.writeFile(aiLogsFilePath, JSON.stringify(aiLogs, null, 2), 'utf8', (writeErr) => {
			if (writeErr) {
				console.error('Error writing to aiLogs.json:', writeErr);
			}
		});
	});
}

client.login(token);