import { Write } from "../../templates/write";
import { render } from "../../utils/response";

export const write = {
  index(): Response {
    return render(<Write />);
  },
};
