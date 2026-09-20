'use strict';
const { getLivesForToday, getTodayFormatted } = require('./supabase.service');
const GAME_EMOJIS = { 'Blox Fruits': '🍎', 'Roube um Egg': '🥚', 'Roube um Ovo': '🥚', 'Roblox': '🎮' };
function emoji(g) { for(const[k,v]of Object.entries(GAME_EMOJIS))if(g&&g.toLowerCase().includes(k.toLowerCase()))return v; return '🎮'; }
const M=['Cada live que voce faz e uma semente plantada. O publico cresce porque voce nao para!','Hoje e mais um dia de oportunidade. A galera vai estar la - e voce tambem vai!','Consistencia e o que separa quem sonha de quem conquista. Voce ta no caminho certo!','Nao existe live ruim quando voce aparece com energia. Bora comecar o dia forte!','A sua presenca ja e motivacao pra muita gente. Apareca e faca a diferenca!','Cada dia na frente do PC e um investimento no seu futuro. Continua assim!','A galera conta com voce. Prepara o mindset e vai com tudo!','Um passo de cada vez. Hoje voce vai mostrar por que nao para!'];
const A=['Ta chegando a hora! Verifica o setup, respira fundo e bora dominar!','A live de hoje vai ser diferente - porque voce vai com tudo!','Faltam poucas horas pro show. Hidrata, se prepara e vai mostrar pra galera!','Sem desculpa, sem adiamento. A hora e essa - voce ta pronto!','O publico ja ta te esperando. Vai la e entrega o melhor de voce!','Lives fortes constroem comunidades fortes. Vai ser epico hoje!','Energia la em cima! Confirma o stream key e quebra tudo!','Voce ja chegou ate aqui. Mais uma live e mais uma vitoria conquistada!'];
function p(pool){const d=new Date();return pool[(d.getDate()+d.getMonth())%pool.length];}
async function buildDailyMessage(period) {
  const lives=await getLivesForToday(), date=getTodayFormatted();
  if(!lives||!lives.length) return period==='morning'
    ? `🌅 *Bom dia!*\n\n📅 *${date}*\n\n😴 Hoje e dia de *Descanso / Especial*.\nAproveita pra recarregar as energias!\n\n💬 _${p(M)}_`
    : `🔔 *Lembrete da tarde*\n\n📅 *${date}*\n\n😴 Hoje e dia de *Descanso*. Descansa e volta mais forte amanha!\n\n💬 _${p(A)}_`;
  const gm={}; for(const l of lives){if(!gm[l.game])gm[l.game]=[]; gm[l.game].push(l.time);}
  const lines=Object.entries(gm).map(([g,t])=>`${emoji(g)} *${g}* - ⏰ ${t.join(', ')}`).join('\n');
  return period==='morning'
    ? `🌅 *Bom dia! Hora de acordar e brilhar!*\n\n📅 *${date}*\n\n🎯 *Lives de hoje:*\n${lines}\n\n💪 _${p(M)}_\n\n🔥 Vai ser incrivel - prepara o setup e bora!`
    : `🔔 *Lembrete - live chegando!*\n\n📅 *${date}*\n\n🎯 *Hoje ainda tem:*\n${lines}\n\n💬 _${p(A)}_\n\n👊 Confirma o setup e vai mostrar pra galera! 🚀`;
}
module.exports = { buildDailyMessage };
