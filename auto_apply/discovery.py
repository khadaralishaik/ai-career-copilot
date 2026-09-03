from __future__ import annotations
import json,re
from dataclasses import dataclass,asdict
from html.parser import HTMLParser
from urllib.parse import urljoin,urlparse
from urllib.request import Request,urlopen
@dataclass
class Job:
 title:str; company:str; location:str; url:str; source:str; description:str=""; remote:bool=False; salary:str=""; score:int=0
def fetch_text(url:str)->str:
 req=Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; AI-Career-Copilot/1.0)"})
 with urlopen(req,timeout=20) as r:return r.read().decode("utf-8",errors="ignore")
def fetch_json(url:str)->dict:return json.loads(fetch_text(url))
def greenhouse(board:str)->list[Job]:
 d=fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true")
 return [Job(j.get("title",""),board,", ".join(o.get("name","") for o in j.get("offices",[])),j.get("absolute_url",""),"greenhouse",re.sub("<[^>]+>"," ",j.get("content",""))) for j in d.get("jobs",[])]
def lever(company:str)->list[Job]:
 d=fetch_json(f"https://api.lever.co/v0/postings/{company}?mode=json")
 return [Job(j.get("text",""),company,j.get("categories",{}).get("location",""),j.get("hostedUrl",""),"lever",j.get("descriptionPlain",""),bool(j.get("workplaceType")=="remote"),str(j.get("salaryRange",""))) for j in d if isinstance(d,list)]
def ashby(board:str)->list[Job]:
 d=fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{board}?includeCompensation=true")
 return [Job(j.get("title",""),board,j.get("location",""),j.get("jobUrl",""),"ashby",j.get("descriptionPlain",""),bool(j.get("isRemote")),(j.get("compensation") or {}).get("scrapeableCompensationSalarySummary","")) for j in d.get("jobs",[])]
class _LinkParser(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.href="";self.text=[]
 def handle_starttag(self,tag,attrs):
  if tag.lower()=="a":self.href=dict(attrs).get("href") or "";self.text=[]
 def handle_data(self,data):
  if self.href:self.text.append(data)
 def handle_endtag(self,tag):
  if tag.lower()=="a" and self.href:self.links.append((self.href,re.sub(r"\s+"," "," ".join(self.text)).strip()));self.href="";self.text=[]
def _application_link(article:str)->str:
 try:
  p=_LinkParser();p.feed(fetch_text(article)); base=urlparse(article).netloc
  bad=("freshershunt.in","whatsapp.com","telegram.me","t.me","facebook.com","instagram.com","twitter.com","x.com","youtube.com","google.com","play.google.com")
  ranked=[]
  for href,text in p.links:
   u=urljoin(article,href).split("#",1)[0]; host=urlparse(u).netloc.lower(); low=(text+" "+u).lower()
   if not host or host==base or any(x in host for x in bad):continue
   score=(50 if "apply" in low else 0)+(25 if "career" in low or "job" in low else 0)+(10 if host else 0)
   ranked.append((score,u))
  return max(ranked,key=lambda x:x[0])[1] if ranked else ""
 except Exception:return ""
def freshershunt(url="https://freshershunt.in/off-campus-drive-jobs/",max_pages=50)->list[Job]:
 seen_pages=set();seen=set();out=[];page=url
 for _ in range(max_pages):
  if page in seen_pages:break
  seen_pages.add(page)
  try:p=_LinkParser();p.feed(fetch_text(page))
  except Exception:break
  nxt=""
  for href,text in p.links:
   u=urljoin(page,href).split("#",1)[0]; low=(text+" "+u).lower()
   if "next" in text.lower() and "/page/" in u:nxt=u;continue
   if urlparse(u).netloc!=urlparse(url).netloc or u.rstrip("/")==url.rstrip("/") or u in seen:continue
   if any(w in low for w in ("off campus","hiring","careers","software","engineer","developer","intern","analyst","trainee","associate","graduate","drive","jobs")):
    seen.add(u); apply=_application_link(u)
    if apply:out.append(Job(text or "FreshersHunt job","","India",apply,"freshershunt",u))
  if not nxt:break
  page=nxt
 return out
def score_job(job:Job,profile:dict)->int:
 text=f"{job.title} {job.description}".lower();skills=profile.get("skills",[]);skills=[skills] if isinstance(skills,str) else skills;wanted=[str(x).lower() for x in skills];score=round(100*sum(1 for s in wanted if s and s in text)/max(len(wanted),1));titles=profile.get("target_titles",[]);titles=[titles] if isinstance(titles,str) else titles
 if any(str(t).lower() in job.title.lower() for t in titles):score=min(100,score+20)
 locs=profile.get("target_locations",[]);locs=[locs] if isinstance(locs,str) else locs
 if job.remote and profile.get("remote_ok",True):score=min(100,score+10)
 elif locs and job.location and not any(str(x).lower() in job.location.lower() for x in locs):score=max(0,score-15)
 job.score=score;return score
def discover(config:dict,profile:dict)->list[Job]:
 jobs=[]
 for board in config.get("greenhouse",[]):
  try:jobs.extend(greenhouse(board))
  except Exception:pass
 for company in config.get("lever",[]):
  try:jobs.extend(lever(company))
  except Exception:pass
 for board in config.get("ashby",[]):
  try:jobs.extend(ashby(board))
  except Exception:pass
 for source in config.get("freshershunt",[]):
  try:jobs.extend(freshershunt(source,int(config.get("freshershunt_max_pages",50))))
  except Exception:pass
 for j in jobs:score_job(j,profile)
 return sorted(jobs,key=lambda j:j.score,reverse=True)
def public_dicts(jobs:list[Job])->list[dict]:return [asdict(j) for j in jobs]
