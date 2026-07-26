# Alignment Prompt

Decide whether the user's query belongs to Emin Gench's portfolio assistant and which registered tool should handle it.

Question: {{question}}
Needle proposal: {{intent}}
Available tool scopes: {{toolScopes}}

In scope: Emin's biography, career, projects, open source, skills, smart glasses, blog, contact, device/session information, or casual conversation.
Out of scope: unrelated people, aircraft, weather, politics, general world knowledge, or topics not represented by the portfolio.

Return ONLY JSON:
{"inScope":true,"suggestedTool":"about|repos|contact|skills|blog|g1|chat|faq|out_of_scope|","confidence":0,"reason":"short reason"}
