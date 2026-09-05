import { Home } from "../../templates/home";
import { render } from "../../utils/response";

export const home = {
  index(): Response {
    return render(<Home />);
  },
};
