export default async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{"Content-Type":"application/json"}});
  try {
    const {message}=await req.json();
    if(!message||typeof message!=="string") return new Response(JSON.stringify({error:"Message is required"}),{status:400,headers:{"Content-Type":"application/json"}});
    const apiKey=Netlify.env.get("OPENAI_API_KEY");
    if(!apiKey) return new Response(JSON.stringify({error:"OPENAI_API_KEY is not configured yet."}),{status:500,headers:{"Content-Type":"application/json"}});
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body:JSON.stringify({model:"gpt-5.6",instructions:"You are Sentra, a helpful personal AI. Reply clearly and briefly in the user's language. Be safe and age-appropriate.",input:message})});
    const data=await response.json();
    if(!response.ok) return new Response(JSON.stringify({error:data?.error?.message||"OpenAI request failed."}),{status:response.status,headers:{"Content-Type":"application/json"}});
    return new Response(JSON.stringify({reply:data.output_text||"मुझे अभी जवाब नहीं मिला।"}),{status:200,headers:{"Content-Type":"application/json"}});
  } catch(e){return new Response(JSON.stringify({error:"Server error."}),{status:500,headers:{"Content-Type":"application/json"}})}
};