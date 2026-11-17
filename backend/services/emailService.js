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

async function envoyerCodeReinitialisation(email, code) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Code de réinitialisation de votre mot de passe BuildTrack',
    text: `Votre code de confirmation est : ${code}\n\nIl est valable pendant 10 minutes. Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.`,
  });
}

module.exports = { envoyerRapportParEmail, envoyerCodeReinitialisation };