from ollama import chat

response = chat(
    model="qwen3:1.7b",
    messages=[
        {
            "role":"system",
            "content": (
                "You are OmniSales AI, a retail shopping assistant."
                "Be concise and helpful. Never invent product prices or stock."
            ),
        },
        {
            "role":"user",
            "content":"Recommend a formal shirt under ₹2000."
        },
    ],
)

print(response.message.content)
