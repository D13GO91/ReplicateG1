import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

interface GroqResponse {
    title: string
    content: string
    next_action?: string
}

export async function POST(request: NextRequest) {
    try {
        const { messages, max_tokens, is_final_answer } = await request.json()

        console.log('Received messages:', messages)
        console.log('Max tokens:', max_tokens)
        console.log('Is final answer:', is_final_answer)

        const GROQ_API_KEY = process.env.GROQ_API_KEY
        if (!GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not defined')
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
        }


        const groq = new Groq({ apiKey: GROQ_API_KEY })

        const payload = {
            model: "llama-3.1-70b-versatile",
            messages,
            max_tokens,
            temperature: 0.2,
            response_format: { type: "json_object" }
        }

        const maxRetries = 3
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}: Sending request to Groq API`)
                const response = await groq.chat.completions.create(payload)

                console.log('Groq API response:', response)

                let content: GroqResponse

                try {
                    content = JSON.parse(response.choices[0].message.content)
                } catch (parseError) {
                    console.error('Error parsing JSON from Groq response:', parseError)
                    throw new Error('Invalid JSON response from Groq API')
                }

                console.log('Parsed content:', content)

                return NextResponse.json(content)
            } catch (error: any) {
                console.error(`Attempt ${attempt} failed:`, error.message)
                if (attempt === maxRetries) {
                    if (is_final_answer) {
                        return NextResponse.json(
                            { title: "Error", content: `Failed to generate final answer after ${maxRetries} attempts. Error: ${error.message}` },
                            { status: 500 }
                        )
                    } else {
                        return NextResponse.json(
                            { title: "Error", content: `Failed to generate step after ${maxRetries} attempts. Error: ${error.message}`, next_action: "final_answer" },
                            { status: 500 }
                        )
                    }
                }
                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    } catch (error: any) {
        console.error('Request handling error:', error)
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}
