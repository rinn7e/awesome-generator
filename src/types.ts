export interface AwesomeItem {
  title: string;
  url: string;
  description: string;
  tags?: string[];
}

export interface AwesomeSection {
  title: string;
  description?: string;
  items: AwesomeItem[];
}

export interface AwesomeFooterSection {
  title: string;
  content: string;
}

export interface AwesomeList {
  slug: string;
  title: string;
  description: string;
  sections: AwesomeSection[];
  footers?: AwesomeFooterSection[];
}
