//the frontend's address. cors and requireSameOrigin only accept requests from
//here; set the FRONTEND_ORIGIN environment variable to change it
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

module.exports = { FRONTEND_ORIGIN };
