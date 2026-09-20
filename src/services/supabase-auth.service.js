'use strict';

const { BufferJSON, initAuthCreds, proto } = require('@whiskeysockets/baileys');

async function useSupabaseAuthState(supabaseClient) {
  const { data: credsRow } = await supabaseClient
    .from('whatsapp_auth')
    .select('data')
    .eq('id', 'creds')
    .single();

  const creds = credsRow?.data
    ? JSON.parse(JSON.stringify(credsRow.data), BufferJSON.reviver)
    : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          const fullIds = ids.map(id => `${type}-${id}`);

          const { data: rows, error } = await supabaseClient
            .from('whatsapp_auth')
            .select('id, data')
            .in('id', fullIds);

          if (!error && rows) {
            for (const row of rows) {
              const id = row.id.replace(`${type}-`, '');
              let value = JSON.parse(JSON.stringify(row.data), BufferJSON.reviver);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            }
          }
          return data;
        },
        set: async (data) => {
          const upserts = [];
          const deletes = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const keyId = `${category}-${id}`;

              if (value) {
                const serialized = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                upserts.push({ id: keyId, data: serialized, updated_at: new Date().toISOString() });
              } else {
                deletes.push(keyId);
              }
            }
          }

          if (upserts.length > 0) {
            await supabaseClient.from('whatsapp_auth').upsert(upserts);
          }
          if (deletes.length > 0) {
            await supabaseClient.from('whatsapp_auth').delete().in('id', deletes);
          }
        },
      },
    },
    saveCreds: async () => {
      const serializedCreds = JSON.parse(JSON.stringify(creds, BufferJSON.replacer));
      await supabaseClient
        .from('whatsapp_auth')
        .upsert({ id: 'creds', data: serializedCreds, updated_at: new Date().toISOString() });
    },
    clearAuth: async () => {
      await supabaseClient.from('whatsapp_auth').delete().neq('id', '___');
    }
  };
}

module.exports = { useSupabaseAuthState };
