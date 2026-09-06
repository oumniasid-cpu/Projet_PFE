const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function envoyerRapportParEmail(emailChefProjet, rapportTexte, nomProjet) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: emailChefProjet,
    subject: `Rapport journalier - ${nomProjet}`,
    text: rapportTexte,
    // ou en HTML si tu veux un format plus propre :
    // html: `<pre style="font-family: Arial;">${rapportTexte}</pre>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { envoyerRapportParEmail };