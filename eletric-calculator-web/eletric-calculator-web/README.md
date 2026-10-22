# Eletric Calculator — versão Web

Versão web **estática** (HTML + JavaScript puro, sem build, sem backend, sem chaves de API) do app Android. O projeto Android original **não foi alterado**.

## Testar no Windows
**Opção 1 (mais simples):** extraia o ZIP e dê duplo-clique em `index.html` (abre no Chrome).
**Opção 2 (servidor local):** na pasta, `python -m http.server 8080` e abra http://localhost:8080.

## Testes (precisa de Node 20+; opcional)
```
node --test tests/calc.test.js        # 16 testes de cálculo
npm i -g playwright && node tests/ui-smoke.js   # teste da interface no Chromium
```
`tests/java-reference.json` foi gerado por `tests/GenRef.java` (`java GenRef.java`), que executa na JVM a mesma matemática do Kotlin. Os testes exigem resultado **idêntico bit a bit** (queda de tensão, potência, rolos, peso) e **idêntico em texto** (`%.2f` do Java; moeda comparada com o ICU/`Intl`).

## Publicar na internet (gratuito)
O site é só uma pasta de arquivos estáticos, então não há servidor para manter.
- **Cloudflare Pages** (recomendado): painel Cloudflare → Workers & Pages → criar Pages → *Upload* (arraste a pasta). Você recebe `https://NOME.pages.dev`. Os menus podem mudar de nome; a Cloudflare vem indicando Workers com Static Assets para projetos novos.
- **GitHub Pages:** suba a pasta em um repositório público → Settings → Pages → *Deploy from a branch* → `main` / `(root)`. Link: `https://USUARIO.github.io/REPO/`.

**Limites informados por fontes de terceiros (jun–set/2026; confirme nas páginas oficiais antes de depender):** Cloudflare Pages — requisições/banda de arquivos estáticos ilimitadas, 500 builds/mês, 20.000 arquivos, sem cartão. GitHub Pages — ~100 GB/mês e 10 builds/hora (limites flexíveis). Evite o plano gratuito da Vercel (Hobby) se for usar comercialmente: é restrito a uso não comercial.

## Status das funcionalidades
**Preservadas (mesmas fórmulas, textos, atalhos, limites e arredondamentos):** Queda de Tensão (monofásico/trifásico, 4% / 7%, bitola sugerida, potência dissipada); Potência & Amperes (3 modos, FP limitado a 0,1–1,0, √3, bitola e disjuntor sugeridos, atalho para Queda de Tensão); Preço de Cabos (15 bitolas, 6 cores, rolos de 100 m com desconto, peso de cobre); Orçamento (itens, margem 0–50%, desconto 0–25%, totais, texto para WhatsApp/copiar); 4 tabelas de fornecedores padrão e troca da tabela ativa; tema claro/escuro.

**Adaptadas:** "Compartilhar" usa o menu do celular (`navigator.share`) ou abre o WhatsApp Web; ícones viram emojis; corte do cabo em SVG simplificado (sem degradê); "Alterar Tabela" é uma lista de seleção.

**Pendentes (lógica já portada e testada em `calc.js`, falta a tela):** edição de preço por bitola, *Nova Semana*, *Reajustar %*, restaurar padrões; Perfil/Conta; Tutorial inicial; salvar/histórico de orçamentos (no Android essa tela existe no código, mas nenhuma navegação leva a ela).

## Observações sobre o app original (preservadas, mas vale revisar)
1. **Disjuntor sugerido** vem da tabela da bitola, não da corrente da carga: 15,91 A → cabo 1,5 mm² e disjuntor 10 A (menor que a carga). Não alterei a regra.
2. **Preços dos fornecedores são dados de exemplo** embutidos no código, não cotações reais.
3. O "login com Google" do Android é simulado com um e-mail pessoal fixo no código; **não foi replicado** na web.
4. A tela de login afirma "criptografia de ponta a ponta", mas a senha fica só em hash local; ao portar essa tela, o texto deve ser corrigido.

## Limites da validação
Não foi possível compilar/executar o Kotlin original (sem Kotlin, Android SDK ou internet neste ambiente). A referência é uma transliteração manual para Java, e a moeda foi conferida com o ICU do Node, equivalente ao do Android. Rode o app Android lado a lado em alguns casos para confirmar.
