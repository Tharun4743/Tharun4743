const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ID = "R_kgDOVkNb1A";
const QA_CATEGORY_ID = "DIC_kwDOVkNb1M4DKqcO";

function runGraphQL(queryStr, variables = {}) {
  const tmpFile = path.join(__dirname, 'tmp_q.graphql');
  fs.writeFileSync(tmpFile, queryStr, 'utf8');
  let cmd = `gh api graphql -F query=@"${tmpFile}"`;
  for (const [k, v] of Object.entries(variables)) {
    cmd += ` -F ${k}=${JSON.stringify(v)}`;
  }
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    return JSON.parse(out);
  } catch (err) {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    throw new Error(err.stdout || err.message);
  }
}

async function createAnswerAndAccept(title, questionBody, answerBody) {
  // 1. Create Discussion
  const createDiscQuery = `
    mutation($repoId: ID!, $catId: ID!, $body: String!, $title: String!) {
      createDiscussion(input: {repositoryId: $repoId, categoryId: $catId, body: $body, title: $title}) {
        discussion {
          id
          number
          url
        }
      }
    }
  `;
  const discRes = runGraphQL(createDiscQuery, {
    repoId: REPO_ID,
    catId: QA_CATEGORY_ID,
    title: title,
    body: questionBody
  });
  
  const discussionId = discRes.data.createDiscussion.discussion.id;
  const discussionUrl = discRes.data.createDiscussion.discussion.url;
  console.log(`Created Discussion: ${discussionUrl}`);

  // 2. Add Comment / Answer
  const addCommentQuery = `
    mutation($discussionId: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
        comment {
          id
        }
      }
    }
  `;
  const commentRes = runGraphQL(addCommentQuery, {
    discussionId: discussionId,
    body: answerBody
  });
  const commentId = commentRes.data.addDiscussionComment.comment.id;
  console.log(`Added Answer: ${commentId}`);

  // 3. Mark as Answer
  const markAnswerQuery = `
    mutation($commentId: ID!) {
      markDiscussionCommentAsAnswer(input: {id: $commentId}) {
        discussion {
          id
          answer {
            id
          }
        }
      }
    }
  `;
  const markRes = runGraphQL(markAnswerQuery, {
    commentId: commentId
  });
  console.log(`Accepted Answer marked: ${markRes.data.markDiscussionCommentAsAnswer.discussion.answer.id}`);
}

(async () => {
  try {
    await createAnswerAndAccept(
      "How to configure autonomous contribution targets?",
      "What is the recommended approach to specify multiple target repositories in the configuration manifest?",
      "You can configure targets in `config/repositories.txt` by providing each repository in `OWNER/REPO` format, separated by newlines. The engine parses this manifest and applies verified maintenance passes sequentially."
    );
    console.log("✅ Galaxy Brain Q&A cycle completed successfully!");
  } catch (e) {
    console.error("Error executing Galaxy Brain cycle:", e.message);
  }
})();

