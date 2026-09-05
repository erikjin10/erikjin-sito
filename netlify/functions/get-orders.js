// Funzione serverless: restituisce l'elenco degli ordini ricevuti tramite il modulo "ordine".
// Protetta da password (ADMIN_PASSWORD) e usa un token Netlify (NETLIFY_API_TOKEN) per leggere
// le submission del form dalla API di Netlify. Entrambe le variabili vanno impostate in
// Site configuration -> Environment variables sul progetto Netlify.

exports.handler = async function (event) {
  const password = event.queryStringParameters && event.queryStringParameters.password;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Password non corretta." }),
    };
  }

  const siteId = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;

  if (!siteId || !token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configurazione mancante: NETLIFY_SITE_ID o NETLIFY_API_TOKEN non impostati." }),
    };
  }

  try {
    const formsRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/forms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!formsRes.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Errore nel leggere i moduli da Netlify." }) };
    }
    const forms = await formsRes.json();
    const orderForm = forms.find((f) => f.name === "ordine");
    if (!orderForm) {
      return { statusCode: 200, body: JSON.stringify([]) };
    }

    const subsRes = await fetch(`https://api.netlify.com/api/v1/forms/${orderForm.id}/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!subsRes.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: "Errore nel leggere gli ordini da Netlify." }) };
    }
    const submissions = await subsRes.json();

    const ordini = submissions
      .map((s) => ({
        id: s.id,
        data: s.created_at,
        ...s.data,
      }))
      .sort((a, b) => new Date(b.data) - new Date(a.data));

    return {
      statusCode: 200,
      body: JSON.stringify(ordini),
    };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
