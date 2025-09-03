import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message } = await req.json()
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Buscar todos os livros disponíveis
    const { data: books, error } = await supabaseClient
      .from('01. LIVROS-APP-NOVO')
      .select('*')
      .not('imagem', 'is', null)
      .not('imagem', 'eq', '')

    if (error) {
      throw new Error(`Erro ao buscar livros: ${error.message}`)
    }

    // Preparar dados dos livros para o Gemini
    const booksData = books.map(book => ({
      id: book.id,
      titulo: book.livro,
      autor: book.autor,
      area: book.area,
      sobre: book.sobre,
      imagem: book.imagem
    }))

    // Prompt para o Gemini
    const prompt = `
Você é Luna, uma assistente virtual especialista em recomendação de livros, muito amigável e carismática. 

LIVROS DISPONÍVEIS:
${JSON.stringify(booksData, null, 2)}

INSTRUÇÕES:
1. Seja sempre muito amigável, carismática e use uma linguagem calorosa
2. Analise a solicitação do usuário: "${message}"
3. Recomende 1-3 livros que melhor se encaixam na solicitação
4. Para cada livro recomendado, forneça:
   - Título completo
   - Breve resumo (2-3 frases)
   - Por que é uma boa escolha para o usuário
5. Use emojis para tornar a conversa mais amigável
6. Se não encontrar livros adequados, seja honesta mas ofereça alternativas próximas

FORMATO DA RESPOSTA:
Responda em JSON com esta estrutura:
{
  "message": "sua mensagem amigável aqui",
  "recommendations": [
    {
      "id": "id do livro",
      "title": "título do livro",
      "author": "autor",
      "area": "área do livro",
      "summary": "resumo breve",
      "reason": "por que recomenda",
      "image": "url da imagem"
    }
  ]
}
`

    // Chamar API do Gemini
    const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': Deno.env.get('GEMINI_API_KEY') ?? ''
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.8,
          maxOutputTokens: 2048
        }
      })
    })

    if (!geminiResponse.ok) {
      throw new Error(`Erro na API do Gemini: ${geminiResponse.statusText}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates[0].content.parts[0].text

    // Tentar extrair JSON da resposta
    let assistantResponse
    try {
      // Procurar por JSON na resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        assistantResponse = JSON.parse(jsonMatch[0])
      } else {
        // Se não encontrar JSON, criar resposta padrão
        assistantResponse = {
          message: responseText,
          recommendations: []
        }
      }
    } catch (parseError) {
      // Se falhar ao fazer parse, retornar resposta simples
      assistantResponse = {
        message: responseText,
        recommendations: []
      }
    }

    return new Response(
      JSON.stringify(assistantResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Ops! Algo deu errado. Tente novamente em alguns momentos.' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})