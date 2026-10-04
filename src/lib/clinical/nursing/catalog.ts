import type { Modality } from "../ktv";

/**
 * Catálogo curado de diagnósticos de enfermagem frequentes em diálise.
 * Títulos genéricos, redigidos para este app; NÃO reproduz o texto da NANDA-I/NIC/NOC
 * (o código NANDA é um campo opcional preenchido pela enfermeira).
 * Apoio à decisão: precisa de validação por enfermeira(o) nefrologista antes do uso clínico.
 */
export type CatalogDiagnosis = {
  id: string;
  title: string;
  /** fatores relacionados mais comuns (a parte "E" do PES) */
  relatedFactors: string[];
  /** características definidoras de referência (a parte "S" do PES) */
  definingCharacteristics: string[];
  /** resultado esperado (planejamento) */
  outcome: string;
  interventions: string[];
  /** modalidades em que se aplica; ausente = todas */
  modalities?: Modality[];
};

const HD: Modality[] = ["HD"];
const DP: Modality[] = ["APD", "CAPD"];

export const CATALOG: CatalogDiagnosis[] = [
  {
    id: "volume_excesso",
    title: "Volume de líquidos excessivo",
    relatedFactors: ["Ingestão excessiva de sódio e líquidos", "Mecanismos reguladores comprometidos (doença renal)", "Ultrafiltração insuficiente"],
    definingCharacteristics: ["Edema", "Ganho de peso interdialítico elevado", "Sobreidratação ao BCM", "Dispneia", "Pressão arterial elevada"],
    outcome: "Atingir o peso seco e manter ganho interdialítico dentro do combinado com a equipe.",
    interventions: ["Pesar e registrar o peso em toda sessão/consulta", "Orientar restrição de sódio e de líquidos", "Monitorar edema, PA e dispneia", "Discutir a meta de ultrafiltração com a equipe médica"],
  },
  {
    id: "volume_deficiente",
    title: "Risco de volume de líquidos deficiente",
    relatedFactors: ["Ultrafiltração excessiva", "Peso seco subestimado", "Ingestão oral reduzida"],
    definingCharacteristics: ["Hipohidratação ao BCM", "Hipotensão", "Câimbras", "Tontura"],
    outcome: "Manter hidratação adequada, sem hipotensão ou câimbras.",
    interventions: ["Monitorar PA e sintomas de hipovolemia", "Revisar o peso seco com a equipe médica", "Orientar a ingestão de líquidos conforme prescrição"],
  },
  {
    id: "risco_infeccao_acesso",
    title: "Risco de infecção relacionado ao acesso",
    relatedFactors: ["Cateter ou fístula como porta de entrada", "Técnica de manipulação inadequada", "Doença crônica e imunossupressão", "Episódio recente de infecção"],
    definingCharacteristics: ["Infecção recente", "Hiperemia ou secreção no sítio do acesso", "Diabetes"],
    outcome: "Manter o acesso sem sinais de infecção.",
    interventions: ["Inspecionar o sítio do acesso em todo atendimento", "Reforçar a técnica asséptica e a higiene das mãos", "Manter o curativo íntegro e trocá-lo conforme o protocolo", "Orientar paciente e cuidador sobre sinais de alerta"],
  },
  {
    id: "risco_peritonite",
    title: "Risco de infecção peritoneal",
    modalities: DP,
    relatedFactors: ["Manipulação do cateter e das conexões", "Falha na técnica de troca", "Episódio prévio de peritonite"],
    definingCharacteristics: ["Peritonite registrada", "Orifício de saída com hiperemia ou secreção", "Efluente turvo"],
    outcome: "Manter-se sem novos episódios de peritonite.",
    interventions: ["Reavaliar a técnica de troca com o paciente e o cuidador", "Inspecionar o orifício de saída", "Orientar quanto ao efluente turvo e dor abdominal", "Revisar o treinamento e a troca da extensão"],
  },
  {
    id: "risco_eletrolitos",
    title: "Risco de desequilíbrio eletrolítico",
    relatedFactors: ["Função renal comprometida", "Dieta rica em potássio ou fósforo", "Adesão parcial a quelantes e à dieta"],
    definingCharacteristics: ["Potássio, fósforo, cálcio ou PTH fora da meta"],
    outcome: "Exames dentro das metas definidas pela equipe.",
    interventions: ["Orientar a dieta (potássio e fósforo)", "Reforçar o uso correto de quelantes", "Acompanhar os exames e comunicar valores críticos", "Encaminhar à nutrição"],
  },
  {
    id: "nutricao_desequilibrada",
    title: "Nutrição desequilibrada: ingestão menor que as necessidades",
    relatedFactors: ["Apetite diminuído", "Restrições dietéticas", "Inflamação e perdas na diálise"],
    definingCharacteristics: ["Apetite diminuído", "Albumina baixa", "Perda de massa magra"],
    outcome: "Manter ou recuperar o estado nutricional.",
    interventions: ["Avaliar ingestão e apetite", "Encaminhar à nutrição", "Orientar fracionamento e fontes proteicas adequadas"],
  },
  {
    id: "fadiga",
    title: "Fadiga",
    relatedFactors: ["Anemia da doença renal crônica", "Carga da terapia dialítica", "Distúrbio do sono"],
    definingCharacteristics: ["Hemoglobina abaixo da meta", "Cansaço referido", "Redução da tolerância às atividades"],
    outcome: "Reduzir a fadiga e preservar as atividades habituais.",
    interventions: ["Acompanhar hemoglobina e ferro e comunicar à equipe médica", "Planejar descanso e atividades ao longo do dia", "Reforçar a adesão ao tratamento da anemia"],
  },
  {
    id: "integridade_pele",
    title: "Integridade da pele prejudicada",
    relatedFactors: ["Prurido urêmico", "Ressecamento da pele", "Fósforo e PTH elevados", "Punções repetidas"],
    definingCharacteristics: ["Prurido", "Pele ressecada", "Lesões de coçadura"],
    outcome: "Pele íntegra e prurido controlado.",
    interventions: ["Inspecionar a pele", "Orientar hidratação e banhos mornos", "Revisar o controle do fósforo", "Comunicar prurido persistente à equipe médica"],
  },
  {
    id: "dor_aguda",
    title: "Dor aguda",
    relatedFactors: ["Punção ou manipulação do acesso", "Infecção local", "Câimbras"],
    definingCharacteristics: ["Dor referida (escala numérica)", "Dor local no acesso"],
    outcome: "Dor controlada (escala ≤ 3) e sem interferência no tratamento.",
    interventions: ["Avaliar a dor pela escala numérica", "Investigar a causa e tratar conforme a prescrição", "Reavaliar após a intervenção"],
  },
  {
    id: "mobilidade_prejudicada",
    title: "Mobilidade física prejudicada",
    relatedFactors: ["Fraqueza e fadiga", "Doença óssea mineral", "Comorbidades"],
    definingCharacteristics: ["Necessita de auxílio para se locomover", "Restrito ao leito"],
    outcome: "Manter a maior independência possível.",
    interventions: ["Avaliar o risco de quedas", "Estimular atividade física compatível", "Encaminhar à fisioterapia"],
  },
  {
    id: "ansiedade",
    title: "Ansiedade",
    relatedFactors: ["Mudança no estado de saúde", "Dependência da terapia dialítica", "Incerteza sobre o tratamento"],
    definingCharacteristics: ["Ansiedade referida ou observada"],
    outcome: "Reduzir a ansiedade e favorecer o enfrentamento.",
    interventions: ["Escutar e acolher", "Esclarecer dúvidas sobre o tratamento", "Envolver a família", "Encaminhar à psicologia e ao serviço social"],
  },
  {
    id: "conhecimento_deficiente",
    title: "Conhecimento deficiente sobre o regime terapêutico",
    relatedFactors: ["Informação insuficiente", "Baixa escolaridade ou dificuldade de leitura", "Recém-admitido no programa"],
    definingCharacteristics: ["Dúvidas frequentes", "Erros de técnica ou de dieta"],
    outcome: "Paciente e cuidador demonstram conhecimento do tratamento.",
    interventions: ["Educação em saúde com linguagem acessível", "Confirmar o entendimento (teach-back)", "Entregar material de apoio", "Registrar o treinamento"],
  },
  {
    id: "adesao_regime",
    title: "Adesão ao regime terapêutico ineficaz",
    relatedFactors: ["Dificuldade com restrição de líquidos e dieta", "Esquecimento de medicamentos", "Barreiras sociais ou financeiras"],
    definingCharacteristics: ["Adesão baixa ou parcial a líquidos, dieta ou medicação", "Faltas ou abreviação de sessões"],
    outcome: "Aumentar a adesão, com metas combinadas com o paciente.",
    interventions: ["Identificar as barreiras com o paciente", "Combinar metas realistas", "Simplificar o esquema (organizador de medicação)", "Envolver a equipe multiprofissional"],
  },
  {
    id: "risco_sangramento",
    title: "Risco de sangramento",
    modalities: HD,
    relatedFactors: ["Uso de heparina na sessão", "Punção da fístula", "Anticoagulantes ou antiagregantes"],
    definingCharacteristics: ["Sangramento prolongado no sítio de punção"],
    outcome: "Hemostasia adequada após as sessões.",
    interventions: ["Verificar o sítio de punção ao final da sessão", "Orientar a compressão correta", "Comunicar o uso de anticoagulantes à equipe médica"],
  },
  {
    id: "risco_glicemia",
    title: "Risco de glicemia instável",
    relatedFactors: ["Diabetes mellitus", "Alterações da dieta e da medicação", "Solução de diálise com glicose (diálise peritoneal)"],
    definingCharacteristics: ["Diabetes"],
    outcome: "Glicemia dentro das metas individuais.",
    interventions: ["Monitorar a glicemia conforme a prescrição", "Reforçar a orientação de dieta e medicação", "Avaliar os pés e a pele"],
  },
  {
    id: "dialise_insuficiente",
    title: "Risco de complicações por dose de diálise insuficiente",
    relatedFactors: ["Tempo de sessão reduzido", "Acesso com fluxo inadequado", "Prescrição de diálise insuficiente"],
    definingCharacteristics: ["Kt/V abaixo da meta"],
    outcome: "Atingir a meta de Kt/V.",
    interventions: ["Verificar o tempo de sessão efetivo e o fluxo do acesso", "Comunicar o Kt/V baixo à equipe médica", "Reforçar a importância de completar as sessões"],
  },
];

export const CATALOG_BY_ID: Record<string, CatalogDiagnosis> = Object.fromEntries(CATALOG.map((c) => [c.id, c]));
