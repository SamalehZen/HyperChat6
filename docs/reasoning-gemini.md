# Raisonnement Gemini 2.5 — HyperChat6

Objectif: activer et paramétrer le raisonnement ("thinking") des modèles Gemini 2.5 (Flash/Pro) via l'API Google AI et l'AI SDK.

Fonctionnalités principales
- Affichage: un onglet/accordéon « Pensée » par message affiche le flux de raisonnement en direct. Ce contenu n'est pas inclus dans la réponse principale ni dans la copie/export.
- Provider: intégration via @ai-sdk/google. Les options de raisonnement sont transmises au moment de la création du modèle.
- Budget par défaut: 8 500 tokens (ajustable jusqu'à 10 000).
- Contrôles UI: réglage global par défaut + override par conversation, activés par défaut.
- Modèles: sélection Gemini 2.5 Flash (par défaut) et Gemini 2.5 Pro.
- Confidentialité: aucune persistance des traces de pensée (runtime uniquement).
- Crédits/coûts: les tokens de pensée sont exclus de la comptabilité des crédits (le coût reste basé sur le mode, non sur les tokens).

Implémentation
1) Provider/SDK
- Mises à jour des dépendances (packages/ai/package.json):
  - ai >= 4.2.0
  - @ai-sdk/google >= 1.2.0
- Extension du provider (packages/ai/providers.ts):
  - getLanguageModel(model, middleware, runtimeOptions) transmet `reasoning`/`thinking: { budgetTokens }` pour Gemini 2.5 via Google AI SDK, avec garde-fous et fallback si non supporté.
  - Le middleware extractReasoningMiddleware('think') est conservé pour séparer le flux « Pensée ».

2) Propagation des options
- Nouveau type ModelRuntimeOptions { reasoningEnabled: boolean; reasoningBudget: number } (packages/ai/models.ts).
- generateText(..., runtimeOptions?) relaie ces options jusqu’à getLanguageModel.
- Les tasks appellent generateText en transmettant context.get('runtimeOptions'). Si reasoningEnabled=false, le provider n’envoie aucun budget (équivalent budget 0).
- max output tokens: aucun mélange avec les tokens de pensée; nous n’imposons pas max_output_tokens quand le raisonnement est activé pour éviter les troncatures inattendues.

3) UI et état
- Global: nouveau store (packages/common/store/settings.store.ts) avec
  - reasoningEnabledDefault = true
  - reasoningBudgetDefault = 8500
  - UI: onglet « IA » dans la modal de paramètres (packages/common/components/settings/ai-settings.tsx), avec un toggle et un slider (0–10 000).
- Conversation: overrides par thread dans chat.store.ts (en mémoire/IndexedDB côté threads pour le reste, mais les traces de pensée ne sont pas persistées). Actions:
  - setReasoningEnabledOverride(threadId, enabled?)
  - setReasoningBudgetOverride(threadId, budget?)
  - clearReasoningOverrides(threadId)
  - runtimeReasoning: mémoire volatile pour le flux « Pensée ».
- Chat actions: sous‑menu « Reasoning » ajouté (packages/common/components/chat-input/chat-actions.tsx) proposant toggle + slider. Sélection modèle Flash/Pro disponible. Application immédiate au thread courant.

4) Onglet « Pensée »
- Nouveau composant ThoughtPanel (packages/common/components/thread/components/thought-panel.tsx) affiché dans chaque message de réponse.
- Le flux est reçu via extractReasoningMiddleware/onReasoning et stocké uniquement en mémoire (runtimeReasoning du chat store). Aucune persistance en localStorage/IndexedDB.

5) Confidentialité
- Les traces de pensée ne sont jamais écrites dans les structures persistées. Dans AgentProvider, le contenu « reasoning » reçu via l’événement "steps" est capté et retiré avant la persistance; seule la réponse utilisateur est stockée.

6) Crédits/coûts
- La logique de crédits (apps/web/app/api/completion/credit-service.ts et shared/config/chat-mode.ts) reste inchangée et n’intègre pas les tokens; par conséquent, les tokens de pensée sont naturellement exclus des coûts/quotas.

7) Tests manuels
- Cas 1 (par défaut):
  - Global activé, budget 8 500, modèle Gemini 2.5 Flash.
  - Résultat: flux « Pensée » visible dans l’onglet + réponse textuelle classique. Les crédits ne changent pas en fonction du flux « Pensée ».
- Cas 2 (override):
  - Désactiver le raisonnement ou fixer budget=100 au niveau de la conversation.
  - Résultat: arrêt/réduction du flux « Pensée » conforme.
- Cas 3 (Pro):
  - Basculer en Gemini 2.5 Pro et répéter Cas 1/2.
- Cas 4 (global OFF):
  - Désactiver globalement. Les nouvelles conversations n’envoient pas de budget et l’onglet « Pensée » reste replié/non alimenté, sauf override local réactivé.

Notes et limites
- Compatibilité SDK: la clé d’option peut être `reasoning` ou `thinking` selon les versions. Nous passons prudemment les deux et gérons le fallback.
- max_output_tokens: nous évitons d’imposer cette limite afin de ne pas affecter l’équilibre « thoughts vs output ».
- Sécurité/partage: le panneau « Pensée » n’est pas exporté ni partagé; il est visible en UI uniquement et en mémoire volatile.
