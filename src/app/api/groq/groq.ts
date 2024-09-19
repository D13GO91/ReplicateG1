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
        console.log('GROQ_API_KEY:', GROQ_API_KEY)

        if (!GROQ_API_KEY) {
            console.error('GROQ_API_KEY is not defined')
            return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
        }

        // Inicializar o cliente Groq conforme a documentação
        const groq = new Groq({ apiKey: GROQ_API_KEY })

        // Instruir o modelo a responder em JSON através de uma mensagem de sistema
        const systemMessage = {
            role: "system",
            content: "Please respond in JSON format with the following structure: {\"title\": \"Your title\", \"content\": \"Your content\", \"next_action\": \"optional next action\"}."
        }

        // Verificar se a primeira mensagem já é uma mensagem de sistema
        const updatedMessages = Array.isArray(messages) && messages.length > 0 && messages[0].role === 'system'
            ? messages
            : [systemMessage, ...messages]

        const payload = {
            model: "llama3-8b-8192", // Utilize um modelo válido conforme a documentação
            messages: updatedMessages,
            max_tokens,
            temperature: 0.2,
            response_format: { type: "json_object" },
            n: 1, // Garantir que apenas uma resposta seja gerada
            presence_penalty: 0, // Valor padrão
            frequency_penalty: 0 // Valor padrão
            // Outros campos opcionais podem ser adicionados conforme necessário
        }

        console.log('Payload:', payload)

        const maxRetries = 3
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Attempt ${attempt}: Sending request to Groq API`)

                const response = await groq.chat.completions.create(payload)

                console.log('Groq API response:', response)

                if (!response || !response.choices || response.choices.length === 0) {
                    throw new Error('No choices returned from Groq API')
                }

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
                console.error(`Attempt ${attempt} failed:`, error.message, error)
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
                await new Promise(resolve => setTimeout(resolve, 1000)) // Espera 1 segundo antes da próxima tentativa
            }
        }
    } catch (error: any) {
        console.error('Request handling error:', error)
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}
