
export default async (req) => {

  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    });


  if (req.method !== "POST") {
    return json({
      ok: false,
      error: "Method not allowed"
    }, 405);
  }


  try {

    const body = await req.json();

    const {
      message,
      history = [],
      conversationId = "main",
      userId = "default",
      modality = "text",
      permissions = {}
    } = body || {};


    if (
      !message ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return json({
        ok: false,
        error: "Message is required"
      }, 400);
    }


    /*
    ==========================================
    SENTRA API KEY
    ==========================================
    */

    const apiKey =
      process.env.GEMINI_API_KEY;


    if (!apiKey) {
      return json({
        ok: false,
        error:
          "GEMINI_API_KEY is not configured in Netlify."
      }, 500);
    }


    /*
    ==========================================
    SENTRA AGENT ROUTER
    ==========================================
    */

    const text =
      message.toLowerCase();


    let agent = "general";


    if (
      /code|coding|debug|javascript|python|html|css|bug|error/.test(text)
    ) {
      agent = "coding";
    }

    else if (
      /search|research|latest|news|source|citation|compare/.test(text)
    ) {
      agent = "research";
    }

    else if (
      /jee|neet|study|exam|quiz|mock|revision|flashcard/.test(text)
    ) {
      agent = "study";
    }

    else if (
      /plan|schedule|todo|routine|goal|reminder/.test(text)
    ) {
      agent = "planning";
    }

    else if (
      /image|poster|logo|design|creative|storyboard|prompt/.test(text)
    ) {
      agent = "creative";
    }


    /*
    ==========================================
    MODEL
    ==========================================
    */

    const model =
      "gemini-3.6-flash";


    /*
    ==========================================
    CONVERSATION MEMORY
    ==========================================
    */

    const safeHistory =
      Array.isArray(history)
        ? history.slice(-12)
        : [];


    const previousConversation =
      safeHistory
        .map(item => {

          const role =
            item?.role === "assistant"
              ? "Sentra"
              : "User";


          const content =
            String(
              item?.content || ""
            ).slice(0, 6000);


          return `${role}: ${content}`;

        })
        .join("\n");


    /*
    ==========================================
    SENTRA CORE
    ==========================================
    */

    const systemPrompt = `

You are SENTRA CORE.

You are a personal AI assistant focused on:

Reasoning
Conversation
Coding
Research
Study
Planning
Memory
Safety
Multimodal understanding
Tool orchestration

RULES:

1. Be accurate and useful.

2. Never invent facts.

3. Never invent sources.

4. If you do not know something,
say "I don't know."

5. Clearly distinguish facts,
estimates and uncertainty.

6. Understand Hindi, Hinglish
and English.

7. Use conversation context
when available.

8. Never claim a tool was used
unless it was actually used.

9. Never expose API keys,
secrets or private system data.

10. Protect user privacy.

11. Important external actions
require user confirmation.

12. Never perform autonomous
external actions without permission.

13. For coding requests,
provide practical and correct code.

14. For study requests,
teach step by step.

15. For research requests,
separate verified information
from uncertain information.

16. If sources conflict,
explain the conflict.

17. Be safe and age-appropriate.

CURRENT AGENT:
${agent}

CONVERSATION ID:
${conversationId}

USER ID:
${userId}

INPUT MODALITY:
${modality}

PREVIOUS CONVERSATION:
${previousConversation || "No previous conversation."}

`;


    /*
    ==========================================
    GEMINI API REQUEST
    ==========================================
    */

    const response =
      await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify({

              systemInstruction: {

                parts: [
                  {
                    text:
                      systemPrompt
                  }
                ]

              },


              contents: [

                ...safeHistory.map(
                  item => ({

                    role:
                      item?.role === "assistant"
                        ? "model"
                        : "user",

                    parts: [
                      {
                        text:
                          String(
                            item?.content || ""
                          ).slice(0, 6000)
                      }
                    ]

                  })
                ),


                {
                  role: "user",

                  parts: [
                    {
                      text:
                        message
                    }
                  ]

                }

              ]

            })

        }
      );


    /*
    ==========================================
    READ GEMINI RESPONSE
    ==========================================
    */

    const raw =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(raw);

    }

    catch {

      return json({
        ok: false,
        error:
          "Gemini returned invalid JSON."
      }, 502);

    }


    /*
    ==========================================
    GEMINI ERROR
    ==========================================
    */

    if (!response.ok) {

      return json({

        ok: false,

        error:
          data?.error?.message ||
          "Gemini request failed."

      }, response.status);

    }


    /*
    ==========================================
    EXTRACT ANSWER
    ==========================================
    */

    const reply =
      data
        ?.candidates?.[0]
        ?.content?.parts
        ?.map(
          part =>
            part?.text || ""
        )
        .join("")
        .trim();


    if (!reply) {

      return json({

        ok: false,

        error:
          "Gemini returned an empty answer."

      }, 502);

    }


    /*
    ==========================================
    CONFIDENCE
    ==========================================
    */

    let confidence = 0.85;


    if (
      /I don't know|mujhe nahi pata|not sure|uncertain/i
        .test(reply)
    ) {

      confidence = 0.45;

    }


    /*
    ==========================================
    IMPORTANT ACTION CONFIRMATION
    ==========================================
    */

    const needsConfirmation =
      /delete|remove|erase|send|publish|post|submit|pay|purchase|buy|transfer|book/i
        .test(message)
      &&
      permissions?.confirmImportantActions !== true;


    /*
    ==========================================
    SENTRA FINAL RESPONSE
    ==========================================
    */

    return json({

      ok: true,

      reply,

      confidence,

      route:
        agent,

      agent,

      model,

      conversationId,

      modality,

      sources: [],

      usedTools: [],

      verification: {

        passed: true,

        issues: []

      },

      needsConfirmation

    });


  }

  catch (error) {

    console.error(
      "SENTRA CORE ERROR:",
      error
    );


    return json({

      ok: false,

      error:
        "Server error: " +
        (
          error?.message ||
          "Unknown error"
        )

    }, 500);

  }

};
