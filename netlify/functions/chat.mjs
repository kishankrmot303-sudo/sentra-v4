export default async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"Content-Type":"application/json"}});
  try {
    const {message} = await req.json();
    if (!message || typeof message !== "string") return new Response(JSON.stringify({error:"Message is required"}),{status:400,headers:{"Content-Type":"application/json"}});
    const apiKey = Netlify.env.get("GEMINI_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({error:"GEMINI_API_KEY is not configured yet."}),{status:500,headers:{"Content-Type":"application/json"}});
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        contents:[{parts:[{text:message}]}],
        systemInstruction:{parts:[{text:"You are Sentra, a helpful personal AI. Reply clearly and briefly in the user's language. Be safe and age-appropriate."}]}
      })
    });
    const data = await response.json();
    if (!response.ok) return new Response(JSON.stringify({error:data?.error?.message || "Gemini request failed."}),{status:response.status,headers:{"Content-Type":"application/json"}});
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "मुझे अभी जवाब नहीं मिला।";
    return new Response(JSON.stringify({reply}),{status:200,headers:{"Content-Type":"application/json"}});
  } catch(e) {
    return new Response(JSON.stringify({error:"Server error."}),{status:500,headers:{"Content-Type":"application/json"}});
  }
};
