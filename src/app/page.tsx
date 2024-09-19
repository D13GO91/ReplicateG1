"use client";

import { useState } from "react";
import axios from "axios";
import Button from "./components/Button";
import Input from "./components/Input";
import Accordion from "./components/Accordion";

interface Step {
  title: string;
  content: string;
  thinking_time: number;
}

const Home = () => {
  const [userQuery, setUserQuery] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!userQuery.trim()) return;

    setLoading(true);
    setSteps([]);
    setTotalTime(null);
    setError(null);

    try {
      const messages = [
        {
          role: "system",
          content: `You are an expert AI assistant that explains your reasoning step by step. For each step, provide a title that describes what you're doing in that step, along with the content. Decide if you need another step or if you're ready to give the final answer. Respond in JSON format with 'title', 'content', and 'next_action' (either 'continue' or 'final_answer') keys. USE AS MANY REASONING STEPS AS POSSIBLE. AT LEAST 3. BE AWARE OF YOUR LIMITATIONS AS AN LLM AND WHAT YOU CAN AND CANNOT DO. IN YOUR REASONING, INCLUDE EXPLORATION OF ALTERNATIVE ANSWERS. CONSIDER YOU MAY BE WRONG, AND IF YOU ARE WRONG IN YOUR REASONING, WHERE IT WOULD BE. FULLY TEST ALL OTHER POSSIBILITIES. YOU CAN BE WRONG. WHEN YOU SAY YOU ARE RE-EXAMINING, ACTUALLY RE-EXAMINE, AND USE ANOTHER APPROACH TO DO SO. DO NOT JUST SAY YOU ARE RE-EXAMINING. USE AT LEAST 3 METHODS TO DERIVE THE ANSWER. USE BEST PRACTICES.

Example of a valid JSON response:
\`\`\`json
{
    "title": "Identifying Key Information",
    "content": "To begin solving this problem, we need to carefully examine the given information and identify the crucial elements that will guide our solution process. This involves...",
    "next_action": "continue"
}
\`\`\`
`,
        },
        { role: "user", content: userQuery },
        {
          role: "assistant",
          content:
            "Thank you! I will now think step by step following my instructions, starting at the beginning after decomposing the problem.",
        },
      ];

      let stepCount = 1;
      let thinkingTime = 0;
      let nextAction = "continue";

      while (nextAction !== "final_answer" && stepCount <= 25) {
        const start = Date.now();
        const response = await axios.post("/api/groq", {
          messages,
          max_tokens: 300,
          is_final_answer: false,
        });
        const end = Date.now();

        const step: Step = {
          title: `Step ${stepCount}: ${response.data.title}`,
          content: response.data.content,
          thinking_time: (end - start) / 1000,
        };

        setSteps((prev) => [...prev, step]);
        thinkingTime += step.thinking_time;

        messages.push({
          role: "assistant",
          content: JSON.stringify(response.data),
        });

        nextAction = response.data.next_action || "continue";
        stepCount += 1;
      }

      if (nextAction === "final_answer") {
        const finalStart = Date.now();
        const finalResponse = await axios.post("/api/groq", {
          messages,
          max_tokens: 200,
          is_final_answer: true,
        });
        const finalEnd = Date.now();

        const finalStep: Step = {
          title: "Final Answer",
          content: finalResponse.data.content,
          thinking_time: (finalEnd - finalStart) / 1000,
        };

        setSteps((prev) => [...prev, finalStep]);
        thinkingTime += finalStep.thinking_time;
      }

      setTotalTime(thinkingTime);
    } catch (error: any) {
      console.error(error);
      setError(error.response?.data?.error || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">
        g1: Usando Llama-3.1 70b no Groq
      </h1>
      <p className="mb-6">
        Este é um protótipo inicial de uso de prompts para criar cadeias de
        raciocínio semelhantes ao o1 para melhorar a precisão das respostas.
        Ainda não é perfeito e a precisão ainda não foi formalmente avaliada. É
        alimentado pela Groq para que o raciocínio seja rápido!
      </p>

      <div className="mb-4">
        <Input
          value={userQuery}
          onChange={(e) => setUserQuery(e.target.value)}
          placeholder="Exemplo: Quantos 'R's há na palavra morango?"
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Gerando resposta..." : "Gerar"}
      </Button>

      {error && <div className="mt-4 text-red-500">{error}</div>}

      <div className="mt-6">
        {steps.map((step, index) => (
          <Accordion key={index} title={step.title} content={step.content} />
        ))}
      </div>

      {totalTime !== null && (
        <div className="mt-4 text-gray-600">
          <strong>Tempo total de raciocínio:</strong> {totalTime.toFixed(2)}{" "}
          segundos
        </div>
      )}
    </div>
  );
};

export default Home;
