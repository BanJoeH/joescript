import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.hostname === "www.joescript.io") {
      url.hostname = "joescript.io";
      return Response.redirect(url.toString(), 301);
    }

    return requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
